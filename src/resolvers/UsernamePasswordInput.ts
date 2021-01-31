import { Field, InputType } from 'type-graphql';

@InputType()
export default class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  email: string;

  @Field()
  password: string;
}
