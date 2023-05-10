import { Command } from "commander";
import IpfsSearchApi from "ipfs-search-client";
import randomWords from "random-words";
import ProgressBar from "progress";

const api = new IpfsSearchApi.DefaultApi();

function generateRandomNumbers(min, max, times) {
  const randoms = [];

  for (let i = 0; i < times; i++) {
    randoms.push(Math.floor(Math.random() * (max - min) + min));
  }

  return randoms;
}

function randomKeyword() {
  return randomWords();
}

async function getIPFSSearchResult(keyword, page, index) {
  let hits = [];
  try {
    const searchResultList = await api.searchGet(keyword, {
      type: "file",
      page: page,
    });
    hits = searchResultList.hits;
  } catch (error) {
    console.log("ERROR: " + JSON.stringify(error));
  }

  return hits[index];
}

async function RandomPickResult(maxCount, onNewCIDGenerated) {
  const keyword = randomKeyword();
  const searchResultList = await api.searchGet(keyword);
  const total = searchResultList.total;
  const pageSize = searchResultList["page_size"];
  const randomIndices = generateRandomNumbers(0, total, maxCount);
  const pageIndices = randomIndices.map((index) => [
    Math.floor(index / pageSize),
    index % pageSize,
  ]);
  let result = [];

  for (const [page, index] of pageIndices) {
    const hit = await getIPFSSearchResult(keyword, page, index);
    onNewCIDGenerated();
    result.push(hit);
  }

  return result;
}

async function randomCID(count, onNewCIDGenerated) {
  let result = [];
  while (result.length < count) {
    const needCount = count - result.length;
    const newResult = await RandomPickResult(needCount, onNewCIDGenerated);
    result.push(...newResult);
  }

  const cids = result.map((hit) => hit.hash);
  return cids;
}

const program = new Command();

program.requiredOption(
  "-c, --count <count>",
  "Number of random CIDs that will be generated"
);
program.parse(process.argv);
const options = program.opts();

const generate = async (count) => {
  count = parseInt(count);
  console.log(`Starting Generating ${count} CID(s)`);
  const progressBar = new ProgressBar("[:bar] :percent", {
    width: 30,
    complete: "=",
    incomplete: " ",
    total: count,
  });
  const result = await randomCID(count, () => {
    progressBar.tick();
  });

  return result;
};

generate(options.count)
  .then((result) => {
    for (const cid of result) {
      console.log(cid);
    }
  })
  .catch(() => {
    console.log("Error");
  });
