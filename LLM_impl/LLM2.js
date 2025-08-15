import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
});

const chat = ai.chats.create({
  model: "gemini-2.5-flash",
  history: [],
});

async function main() {
  const userProblem = readlineSync.question("Ask me anything---> ");
  const response1 = await chat.sendMessage({
    message: userProblem,
  });

  console.log(response1.text);
  main();
}

main();
