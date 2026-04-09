import express from "express";
import contactsRouter from "./routes/contacts";
import verifyRouter from "./routes/verify";
import pdaRouter from "./routes/pda";
import { PORT } from "./constants";

const app = express();
app.use(express.json());

app.use("/api/contacts", contactsRouter);
app.use("/api/verify-ownership", verifyRouter);
app.use("/api/derive-pda", pdaRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
