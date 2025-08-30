import express from "express";
import { CreateChatSchema } from "./types";

const app = express();
const port = 3000;
app.use(express.json());

app.post("/chat", (req, res) => {
    const{success, data} = CreateChatSchema.safeParse(req.body);
    if(!success){
        return res.status(400).json({message : "Invalid request"});
    }
    const {message} = data;
    //OpenRouter
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});