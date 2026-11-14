// Prints guide.html to the PDF sent to instructors: node teaching-materials/instructor-guide/build-pdf.mjs
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(new URL("./guide.html", import.meta.url).href);
await page.pdf({ path: fileURLToPath(new URL("./CS-Class-강사님-안내서.pdf", import.meta.url)), format: "A4", printBackground: true, preferCSSPageSize: true });
await browser.close();
