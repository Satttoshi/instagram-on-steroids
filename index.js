const puppeteer = require("puppeteer");
const dotenv = require("dotenv");

dotenv.config();

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
  await page.waitForNavigation({
    waitUntil: "networkidle2",
  });
  console.log("login successful!");

  return { browser, page };
}

// Function to like a post based on a given tag
async function likePostsInTag(page, tag) {
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
    await timeout();
    // Go to the post page, if error try a different post
    try {
      await page.goto(link, {
        waitUntil: "networkidle2",
      });
    } catch (error) {
      console.log(`Failed to navigate to ${link}: ${error}`);
      console.log("proceeding next post ...");
      return;
    }

    // Waiting for either of the two SVG elements to be visible.
    await page.waitForSelector(
      'button[type="button"] svg[aria-label="Gefällt mir"], button[type="button"] svg[aria-label="Gefällt mir nicht mehr"]'
    );

    // Try selecting the "Gefällt mir nicht mehr" SVG.
    let svgElement = await page.$(
      'button[type="button"] svg[aria-label="Gefällt mir nicht mehr"]'
    );

    // If "Gefällt mir nicht mehr" SVG is found, then the button is liked.
    if (svgElement) {
      console.log("current post status: liked");
      console.log("proceeding next post ...");
      await sleep(3000);
      return;
    }
    // Try selecting the "Gefällt mir" SVG.
    svgElement = await page.$(
      'button[type="button"] svg[aria-label="Gefällt mir"]'
    );

    // If "Gefällt mir" SVG is found, then the button is not liked.
    if (svgElement) {
      console.log("current post status: not liked");
      await randomSleep(3, 15, "like current post in");
      // Like the post if not liked
      const x = 458;
      const y = 350;
      await page.mouse.click(x, y);
      console.log("post was liked successfully!");
      counter++;

      // Delay the next like action
      await randomSleep(1, 15, "goto next in");

      return;
    }

    // If neither SVG is found, then the button is not found.
    console.log("current post status: not found");
    console.log("proceeding next post ...");
    return;
  }
}

async function timeout() {
  if (counter >= target) {
    // reset variables
    counter = 0;
    target = getRandomNumber(400, 1000);
    console.log(
      "new target, this many posts gonna be liked in next iteration: " + target
    );
    // delay between 6 and 12 hours
    await randomSleep(21600, 43200, "bot is going to sleep for");
    return;
  }
  return;
}

// Login credentials
const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;

// Post Tags
const tags = [
  "girl",
  "beautiful",
  "scenery",
  "nature",
  "photography",
  "travel",
  "adventure",
  "fashion",
  "beauty",
  "landscape",
  "wanderlust",
  "naturelovers",
  "photooftheday",
  "picoftheday",
  "instagood",
  "outdoors",
  "earth",
  "explore",
  "mountains",
  "wildlife",
  "model",
  "style",
  "instatravel",
  "naturephotography",
  "love",
  "life",
  "art",
  "inspiration",
  "selfie",
  "fitness",
  "healthy",
  "lifestyle",
  "motivation",
  "travelphotography",
  "portrait",
  "sunset",
  "sunrise",
  "skyporn",
  "ocean",
  "vacation",
  "holiday",
  "beach",
  "sea",
  "forest",
  "flowers",
  "wildlifephotography",
  "travelgram",
  "landscapelovers",
  "earthpix",
  "paradise",
  "wonderful_places",
  "beautifuldestinations",
];

let counter = 0;
let target = 100;

// Run the bot
async function run() {
  const { browser, page } = await login(username, password);

  for (const tag of tags) {
    await likePostsInTag(page, tag);
  }

  await browser.close();

  console.log("All tags have been iterated!");

  // Run the bot again after a random delay
  const delay = getRandomDelay(60, 180);
  console.log(`Restarting Iteration in ${delay} seconds ...`);
  await sleep(delay * 1000);
  run();
}

// Start the bot
run();
