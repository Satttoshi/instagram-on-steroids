import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { tags } from "./src/tags.js";
import { ansi } from "./src/ansi.js";

dotenv.config();

// ANSI escape codes for colored console
const { reset, red, green, bold } = ansi;

// Function to generate a random delay between likes
function getRandomNumber(from, to) {
  return Math.floor(Math.random() * (to - from + 1)) + from;
}

async function randomSleep(from, to, description) {
  const delay = getRandomNumber(from, to);
  console.log(`${description} ${delay} seconds ...`);
  await sleep(delay * 1000);
  return;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to log in to Instagram
async function login(username, password) {
  const browser = await puppeteer.launch({
    headless: false,
    // executablePath: "/usr/bin/chromium-browser",
    // args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  // Set a random user agent for the browser
  const userAgents = [
    // Chrome on Windows 10
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537",
  ];
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  await page.setUserAgent(userAgent);

  await page.setViewport({
    width: 800,
    height: 600,
  });

  // Go to the Instagram login page
  await page.goto("https://www.instagram.com/accounts/login/", {
    waitUntil: "networkidle2",
  });

  // Accept cookies
  const cookieButton = await page.$x(
    '//button[contains(text(), "Alle Cookies erlauben")]'
  );
  if (cookieButton.length > 0) {
    await cookieButton[0].click();
  }

  // Fill in the login form and submit
  await page.type('input[name="username"]', username);
  await page.type('input[name="password"]', password);

  await sleep(2000);

  const clickLogin = async () => {
    const x = 396;
    const y = 263;
    await page.mouse.click(x, y);
    return "attempt to login ...";
  };

  console.log(await clickLogin());

  // Wait for the login to complete

  try {
    await page.waitForNavigation({
      waitUntil: "networkidle2",
    });
    console.log("login successful!");
    await handleWarning();
    return { browser, page };
  } catch (error) {
    throw new Error("login failed!");
  }
}

async function handleWarning() {
  // Does warning exists (html page as dummy in test.html) if text in spawn exists

  let warningData;

  try {
    await sleep(2000);
    const warning = await page.$x(
      '//span[contains(text(), "Wir haben den Verdacht")]'
    );
    warningData = warning;
  } catch (error) {
    console.log("warning does not exist");
    return;
  }

  if (warningData) {
    console.log("warning exists");
  }

  return;
}

// Function to like a post based on a given tag
async function likePostsInTag(page, tag) {
  console.log(`${bold}SWITCHING TO TAG: #${tag} ...${reset}`);
  console.log("");
  // Go to the explore page for the given tag
  await page.goto(`https://www.instagram.com/explore/tags/${tag}/`, {
    waitUntil: "networkidle2",
  });

  // Wait for the page to load the posts
  await page.waitForSelector("article a[href]");

  // Get the links to the posts
  const postLinks = await page.$$eval("article a[href]", (links) =>
    links.map((link) => link.href)
  );

  // Loop through the post links and like each post
  for (const link of postLinks) {
    // Go to the post page
    await likePost(link);
  }

  async function likePost(link) {
    console.log(
      `${bold}${new Date().toLocaleString()}${reset} - current tag: #${tag}`
    );
    console.log(
      `current liked posts: ${bold}${counter}${reset} to target -> ${bold}${target}${reset}`
    );

    await timeout();
    // Go to the post page, if error try a different post
    try {
      await page.goto(link, {
        waitUntil: "networkidle2",
      });
    } catch (error) {
      console.log(`${red}Failed to navigate to ${link}: ${error}`);
      console.log("proceeding next post ...");
      console.log("");
      return;
    }

    // Handle warning, if it exists then click it away LOL
    await handleWarning();

    // Waiting for either of the two SVG elements to be visible.
    await page.waitForSelector(
      'svg[aria-label="Gefällt mir"], svg[aria-label="Gefällt mir nicht mehr"]'
    );

    // Try selecting the "Gefällt mir nicht mehr" SVG.
    let svgElement = await page.$('svg[aria-label="Gefällt mir nicht mehr"]');

    // If "Gefällt mir nicht mehr" SVG is found, then the button is liked.
    if (svgElement) {
      console.log(`current post: #${tag} is already liked${reset}`);
      console.log("proceeding next post ...");
      console.log("");
      await sleep(3000);
      return;
    }
    // Try selecting the "Gefällt mir" SVG.
    svgElement = await page.$('svg[aria-label="Gefällt mir"]');

    // If "Gefällt mir" SVG is found, then the button is not liked.
    if (svgElement) {
      console.log(`current post: #${tag}`);
      await randomSleep(3, 15, "like current post in");
      // Like the post if not liked
      const x = 458;
      const y = 350;
      await page.mouse.click(x, y);
      console.log(`current post was ${bold}${green}liked${reset}!`);
      counter++;

      // Delay the next like action
      await randomSleep(1, 15, "goto next in");
      console.log("");

      return;
    }

    // If neither SVG is found, then the button is not found.
    console.log("current post status: not found");
    console.log("proceeding next post ...");
    console.log("");
    return;
  }
}

async function timeout() {
  if (counter >= target) {
    // reset variables
    counter = 0;
    target = getRandomNumber(600, 2000);
    console.log("new target set for next iteration: " + target);
    // delay between 6 and 12 hours
    await randomSleep(21600, 43200, "bot is going to sleep for");
    console.log("");
    return;
  }
  return;
}

// Login credentials
const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;

let counter = 0;
let target = getRandomNumber(600, 2000);

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Run the bot
async function run() {
  let browserData;
  let pageData;

  try {
    const { browser, page } = await login(username, password);
    browserData = browser;
    pageData = page;
  } catch (error) {
    console.log(error);
  }
  // Shuffle the tags array
  console.log("shuffle tags ...");
  const shuffledTags = shuffleArray(tags);
  console.log("shuffled tags: " + shuffledTags);
  console.log("");

  for (const tag of shuffledTags) {
    await likePostsInTag(pageData, tag);
  }

  await browserData.close();

  console.log("All tags have been iterated!");

  // Run the bot again after a random delay
  const delay = getRandomDelay(60, 180);
  console.log(`Restarting Iteration in ${delay / 60} minutes ...`);
  console.log("");
  await sleep(delay * 1000);
  run();
}

console.log(
  `${bold}instagram-on-steroids started at ${new Date().toLocaleString()}${reset}`
);
console.log("");

// Start the bot
run();
