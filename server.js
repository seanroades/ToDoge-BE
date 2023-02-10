const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5069;

const cors = require('cors');
const path = require('path');
var bodyParser = require('body-parser');

const { Configuration, OpenAIApi } = require("openai");

const stripe = require('stripe')("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");

app.use(cors());

const MongoClient = require("mongodb").MongoClient;
const client = new MongoClient(process.env.DB_URI)
var jsonParser = bodyParser.json()
// yuh
YOUR_DOMAIN = 'https://master--cs178-todo-sr.netlify.app/';
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.get('/api/hello', (req, res) => {
  res.send({ express: 'Hello From Express' });
});

app.post('/api/getList', jsonParser, async (req, res) => {
  await client.connect();
  try {
    const database = client.db("todoge");
    const lists = database.collection("lists");
    const query = { name: req.body.name };
    const options = {
    };
    const list = await lists.findOne(query, options);
    if (list) {
      if (list.pin !== req.body.pin) {
        res.send({
          success: false,
          data: null
        });
        return;
      }
    }
    // since this method returns the matched document, not a cursor, print it directly
    console.log(list);
    res.send({
      success: true,
      data: list
    });
  } catch (err) {
    console.log(err.stack);
  }
});

app.post('/api/modifyList', jsonParser, async (req, res) => {
  await client.connect();
  try {
    const database = client.db("todoge");
    const lists = database.collection("lists");
    const filter = { name: req.body.name };
    // this option instructs the method to create a document if no documents match the filter
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        todos: req.body.list
      },
    };
    const result = await lists.updateOne(filter, updateDoc, options);
    console.log(
      `${result.matchedCount} document(s) matched the filter, updated ${result.modifiedCount} document(s)`,
    );
  } catch (err) {
    console.log(err.stack);
  }
})

app.post('/api/makeList', jsonParser, async (req, res) => {
  await client.connect();
  try {
    const database = client.db("todoge");
    const lists = database.collection("lists");
    // create a document to insert
    const doc = {
      name: req.body.name,
      pin: req.body.pin,
      todos: []
    }
    const query = { name: req.body.name };
    const options = {
    };
    const list = await lists.findOne(query, options);
    if (list) {
      res.send({
        success: false,
        data: 'list already exists'
      });
      return;
    }
    const result = await lists.insertOne(doc);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
    res.send({
      success: true,
      data: 'completed operation'
    })
  } catch (err) {
    console.log(err.stack);
  }
})

app.get('/api/upgrade', async (req, res) => {
  await client.connect();
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        price: 'price_1MZHmbA20LnLaUFwl66ItA0s',
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${YOUR_DOMAIN}?success=true`,
    cancel_url: `${YOUR_DOMAIN}?canceled=true`,
  });
  console.log(session.url)
  res.send({
    success: true,
    data: [session.url.toString()]
  })
});

app.post('/api/dogechat', jsonParser, async (req, res) => {
  await client.connect();
  var chatlog = req.body.chatlog
  var prompt = "Pretend you are a sad dog who was betrayed. \nYou are now talking to a human who betrayed you. Respond to them and ask them questions. The conversation will be provided below with your previous lines marked as \"dog:\" and their previous lines  marked as \"human\" for context.\ndog: 'why did you betray me human'?\n"
  var newprompt = prompt + chatlog;
  var superchargedPrompt = newprompt + 'Now continue this conversation as the dog:'
  try {
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: superchargedPrompt,
    temperature: 0.8,
    max_tokens: 200,
    top_p: 1.0,
    frequency_penalty: 0.2,
    presence_penalty: 0.0,
    stop: ["human:"],
  })
  res.send({
    success: true,
    data: [response.data]
  })
  } catch (error) {
  console.log(error)
    res.send({
      success: false,
      data: [error]
    })
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});