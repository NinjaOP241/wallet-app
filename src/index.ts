import { createApp } from "./app.js";
import { PORT } from "./shared/config/env.js";

const app = createApp();

app.listen(PORT, () => {
  console.log(`[server]: Running on port ${PORT}`);
});
