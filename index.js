const puppeteer = require("puppeteer");
const dotenv = require("dotenv");

dotenv.config();

// Function to generate a random delay between likes
function getRandomDelay() {
  // Generate a random number between 1 and 10 (in seconds)
  return Math.floor(Math.random() * 10) + 1;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to log in to Instagram
async function login(username, password) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

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

  const loginButton = await page.$x('//button[contains(text(), "Anmelden")]');
  if (loginButton.length > 0) {
    await loginButton[0].click();
  }

  // Wait for the login to complete
  await page.waitForNavigation({
    waitUntil: "networkidle2",
  });

  return { browser, page };
}

// Function to like a post based on a given tag
async function likePost(page, tag) {
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
    await page.goto(link, {
      waitUntil: "networkidle2",
    });

    // Check if the post is already liked
    const isLiked = await page.$('span[aria-label="Unlike"]');

    // Like the post if it is not already liked
    if (!isLiked) {
      await page.click('button svg[aria-label="Like"]');
    }

    // Delay the next like action
    const delay = getRandomDelay();
    await page.waitFor(delay * 1000);
  }
}

// Replace 'YOUR_USERNAME' and 'YOUR_PASSWORD' with your Instagram credentials
const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;

// Replace 'TAG1', 'TAG2', etc. with the tags you want to use
const tags = ["girl", "beautiful", "scenery", "nature", "photography"];

// Start the bot
(async () => {
  const { browser, page } = await login(username, password);

  for (const tag of tags) {
    await likePost(page, tag);
  }

  await browser.close();
})();
