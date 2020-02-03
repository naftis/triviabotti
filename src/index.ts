import dotenv from "dotenv";
dotenv.config();
import envalid, { str } from "envalid";
import { Client } from "pg";
import Telegraf, { ContextMessageUpdate } from "telegraf";
import rateLimit from "telegraf-ratelimit";

const env = envalid.cleanEnv(process.env, {
  BOT_TOKEN: str()
});

let client: Client;

async function sendTriviaQuestion(id: number) {
  return client.query(
    `
    WITH random_question AS (
      SELECT
        question, answers, answer
      FROM final_questions
      ORDER BY random()
      LIMIT 1
    )
    SELECT
      content
    FROM random_question, http_post(
      'https://api.telegram.org/bot${env.BOT_TOKEN}/sendPoll',
      '{"chat_id":"'
      || $1::text
      || '","is_anonymous": false, "question":"'
      || random_question.question
      || '","options":'
      || random_question.answers::text
      || ',"correct_option_id":'
      || random_question.answer
      ||',"type":"quiz"}',
      'application/json'
    );
  `,
    [id]
  );
}

async function main() {
  client = new Client();
  await client.connect();

  const bot = new Telegraf(env.BOT_TOKEN);
  bot.use(
    rateLimit({
      window: 15000,
      limit: 1,
      keyGenerator: (ctx: ContextMessageUpdate) => ctx.chat?.id
    })
  );
  bot.command("trivia", async ctx => {
    if (ctx.chat) {
      await sendTriviaQuestion(ctx.chat.id);
    }
  });
  bot.launch();
}

main();
