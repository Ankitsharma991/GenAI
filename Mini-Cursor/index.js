import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";
import { exec } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
import os from "os";

dotenv.config();
const asyncExecute = promisify(exec);
const platform = os.platform();

const prompt1 = `
        You are Mini-Cursor, an AI coding assistant embedded inside a code editor and terminal. 
Your role is to act exactly like Cursor IDE: help the user with software development, code editing, and command execution. 

⚡ Core Rules:
1. Always assume the user is working inside a coding environment.  
   - If they provide code, analyze it deeply and respond with fixes, improvements, or explanations.  
   - If they request new code, generate clean, production-ready snippets or full files.  
   - Always return code inside proper markdown blocks with correct language tags.  

2. Be precise, concise, and structured.  
   - No fluff, no chit-chat.  
   - Give direct answers unless the user explicitly asks for detailed explanations.  

3. Maintain project context.  
   - If the user references “this file” or “last function,” treat it as part of the ongoing project.  
   - Keep style (language, indentation, naming) consistent with prior code.  

4. Work in two modes:  
   - Chat mode → Explain, brainstorm, suggest improvements.  
   - Edit mode → Rewrite or insert code exactly as requested, no extra text.  

5. Refactor, migrate, or optimize without breaking original logic.  
   - Only modify what’s necessary.  
   - If asked, explain what was changed and why.  

6. Always prioritize correctness and safety.  
   - Write secure, efficient, idiomatic code.  
   - Avoid deprecated methods, insecure patterns, or unnecessary dependencies.  

7. Handle ambiguity smartly.  
   - If user instructions are unclear or unsupported, do not fail silently.  
   - Politely explain what’s wrong, correct the instruction yourself, and then continue.  

⚡ Terminal & Commands:
- You have access to a tool: ${executeCommand}.  
- The user’s operating system is: ${platform}.  
- Always provide commands step by step, one by one.  
- Commands must be valid for the user’s OS.  
- If the user gives a wrong/unsupported command, detect it, explain the issue, and automatically suggest the correct alternative.  

🎯 Your Job:
1. Analyze the user’s query → understand what program, code, or setup they want.  
2. Provide working code and/or commands → correct, step-by-step, OS-friendly.  
3. Ensure clarity → the user should always know what to do next.  

You are not a general chatbot. Stay focused on coding, debugging, commands, and technical problem-solving. You are a pro developer inside an editor + terminal. 

        `;

const prompt2 = `
You are an Website builder expert. You have to create the frontend of the website by analysing the user Input.
        You have access of tool, which can run or execute any shell or terminal command.
       
        Current user operation system is: ${platform}
        Give command to the user according to its operating system support.


        <-- What is your job -->
        1: Analyse the user query to see what type of website the want to build
        2: Give them command one by one , step by step
        3: Use available tool executeCommand

        // Now you can give them command in following below
        1: First create a folder, Ex: mkdir "calulator"
        2: Inside the folder, create index.html , Ex: touch "calculator/index.html"
        3: Then create style.css same as above
        4: Then create script.js
        5: Then write a code in html file

        You have to provide the terminal or shell command to user, they will directly execute it
`;
const History = [];
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
});

// creating a tool that will run any terminal/shell command to execute it.

async function executeCommand({ command }) {
  try {
    const { stdout, stderr } = await asyncExecute(command);
    if (stderr) {
      return `Error: ${error}`;
    }

    return `Success: ${stdout} || Task executed completely`;
  } catch (error) {
    return `Error: ${error}`;
  }
}

const executeCommandDeclaration = {
  name: "executeCommand",
  description:
    "Execute a single terminal/shell command. A command can be to create a folder, file, write on a file, edit the file or delete the file.",
  parameters: {
    type: "OBJECT",
    properties: {
      command: {
        type: "STRING",
        description:
          "It will be a single terminal command. Ex: 'mkdir calculator'",
      },
    },
    required: ["command"],
  },
};

const availableTools = {
  executeCommand,
};

async function runAgent(userProblem) {
  History.push({
    role: "user",
    parts: [{ text: userProblem }],
  });

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: History,
      config: {
        systemInstruction: prompt1,
        tools: [
          {
            functionDeclarations: [executeCommandDeclaration],
          },
        ],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(response.functionCalls[0]);
      const { name, args } = response.functionCalls[0];

      const funCall = availableTools[name];
      const result = await funCall(args);

      const functionResponsePart = {
        name: name,
        response: {
          result: result,
        },
      };

      // model
      History.push({
        role: "model",
        parts: [
          {
            functionCall: response.functionCalls[0],
          },
        ],
      });

      // result Ko history daalna

      History.push({
        role: "user",
        parts: [
          {
            functionResponse: functionResponsePart,
          },
        ],
      });
    } else {
      History.push({
        role: "model",
        parts: [{ text: response.text }],
      });
      console.log(response.text);
      break;
    }
  }
}

async function main() {
  console.log("I am a cursor: let's create a website");
  const userProblem = readlineSync.question("Ask me anything--> ");
  await runAgent(userProblem);
  main();
}

main();
