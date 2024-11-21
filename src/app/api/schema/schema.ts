import { Schema } from "effect";

export const Data = Schema.Struct({
  message: Schema.String,
  code: Schema.Number,
});
