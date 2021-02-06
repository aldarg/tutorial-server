/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import argon2 from 'argon2';
import { v4 } from 'uuid';
import sendEmail from '../utils/sendEmail';
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from '../constants';
import User from '../entities/User';
import { MyContext } from '../types';
import validateRegister from '../utils/validateRegister';
import UsernamePasswordInput from './UsernamePasswordInput';

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  // eslint-disable-next-line type-graphql/invalid-nullable-output-type
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  // eslint-disable-next-line type-graphql/invalid-nullable-output-type
  user?: User;
}

@Resolver()
class UserResolver {
  @Query(() => User, { nullable: true })
  // eslint-disable-next-line type-graphql/invalid-nullable-output-type
  async me(@Ctx() { req }: MyContext): Promise<User | undefined> {
    if (!req.session.userId) {
      return undefined;
    }

    return User.findOne(req.session.userId);
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(options.password);
    let user;
    try {
      // const result = await getConnection()
      //   .createQueryBuilder()
      //   .insert()
      //   .into(User)
      //   .values({
      //     username: options.username,
      //     email: options.email,
      //     password: hashedPassword,
      //   })
      //   .returning('*')
      //   .execute();
      // [user] = result.generatedMaps;
      user = await User.create({
        username: options.username,
        email: options.email,
        password: hashedPassword,
      }).save();
    } catch ({ code }) {
      if (code === '23505') {
        return {
          errors: [
            {
              field: 'username',
              message: 'username is already been taken',
            },
          ],
        };
      }
    }

    if (user) {
      req.session.userId = user.id;
    }

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const searchField = usernameOrEmail.includes('@') ? 'email' : 'username';
    const user = await User.findOne({
      where: { [searchField]: usernameOrEmail },
    });

    if (!user) {
      return {
        errors: [
          {
            field: 'usernameOrEmail',
            message: "that username doesn't exist",
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password',
          },
        ],
      };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext): Promise<boolean> {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);

        if (err) {
          resolve(false);
          return;
        }

        resolve(true);
      })
    );
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg('email') email: string,
    @Ctx() { redis }: MyContext
  ): Promise<boolean> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return true;
    }

    const token = v4();
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      'ex',
      1000 * 60 * 60 * 24 * 3
    );
    const link = `http://localhost:3000/change-password/${token}`;

    await sendEmail(email, `<a href="${link}">reset your password</a>`);

    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors: [
          {
            field: 'newPassword',
            message: 'password is too short',
          },
        ],
      };
    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userIdRecord = await redis.get(key);
    if (!userIdRecord) {
      return {
        errors: [
          {
            field: 'token',
            message: 'token expired',
          },
        ],
      };
    }

    const userId = parseInt(userIdRecord, 10);
    const user = await User.findOne(userId);

    if (!user) {
      return {
        errors: [
          {
            field: 'token',
            message: 'user not longer exists',
          },
        ],
      };
    }

    await User.update(
      { id: user.id },
      {
        password: await argon2.hash(newPassword),
      }
    );

    await redis.del(key);

    req.session.userId = user.id;

    return { user };
  }
}

export default UserResolver;
