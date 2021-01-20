import 'reflect-metadata';
import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { MikroORM } from '@mikro-orm/core';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import HelloResolver from './resolvers/hello';
import PostResolver from './resolvers/post';
import microConfig from './mikro-orm.config';
import UserResolver from './resolvers/user';
import __prod__ from './constants';
import { MyContext } from './types';

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const app = express();

  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();
  app.use(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    session({
      name: 'qid',
      store: new RedisStore({
        client: redisClient,
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
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res }),
  });

  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log('Servers listens now on port 4000');
  });
};

main().catch((err) => {
  console.error(err);
});
