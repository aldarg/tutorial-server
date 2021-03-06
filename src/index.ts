import 'reflect-metadata';
import { createConnection } from 'typeorm';
import Redis from 'ioredis';
import cors from 'cors';
import session from 'express-session';
import connectRedis from 'connect-redis';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import HelloResolver from './resolvers/hello';
import PostResolver from './resolvers/post';
import UserResolver from './resolvers/user';
import { COOKIE_NAME, __prod__ } from './constants';
import { MyContext } from './types';
import Post from './entities/Post';
import User from './entities/User';

const main = async () => {
  const conn = await createConnection({
    type: 'postgres',
    database: 'tutorial_db2',
    username: 'postgres',
    password: 'postgres',
    logging: true,
    synchronize: true,
    entities: [Post, User],
  });

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    })
  );

  app.use(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis as never,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 265 * 10, // 10 years
        httpOnly: true,
        sameSite: 'lax', // csrf
        secure: __prod__, // https only when on prod
      },
      saveUninitialized: false,
      secret: 'sdlkfjglskdngflkjsroitgjlfdgblkfg',
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ req, res, redis }),
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(4000, () => {
    console.log('Servers listens now on port 4000');
  });
};

main().catch((err) => {
  console.error(err);
});
