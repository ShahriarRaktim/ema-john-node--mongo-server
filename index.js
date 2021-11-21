const express = require("express");
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
const { MongoClient } = require("mongodb");
var admin = require("firebase-admin");
require("dotenv").config();

const app = express();
const port = 5000;

//firebase admin initialization

var serviceAccount = require("./react-firebase-authentic-5516a-firebase-adminsdk-vlbjj-fc3122f9f4.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//middleWare
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0js5x.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers.authorization.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
   
      req.decodedUserEmail = decodedUser.email;
    } catch {}
  }
  next();
}
async function run() {
  try {
    await client.connect();
    const database = client.db("onlineShop");
    const productCollection = database.collection("products");
    const userCollection = database.collection("users");

    app.get("/products", async (req, res) => {
      const cursor = productCollection.find({});
      const page = req.query.page;
      const size = parseInt(req.query.size);
      let products;
      const count = await cursor.count();
      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }
      res.send({
        count,
        products,
      });
    });

    //get
    app.get("/myorder", verifyToken, async (req, res) => {
      
      const email = req.query.email;
      if (req.decodedUserEmail === email) {

        const query = { email: email };
        const cursor = userCollection.find(query);
        const order = await cursor.toArray();
        res.json(order);
      }
      else{
        res.status(401).json({message:'User not authorized'})
      }
    });

    //Post
    app.post("/products/byKeys", async (req, res) => {
      const keys = req.body;
      const query = { key: { $in: keys } };
      const products = await productCollection.find(query).toArray();
      res.json(products);
    });

    //Post
    app.post("/products/shipping", async (req, res) => {
      const data = req.body;
      data.createAt = new Date();
      const result = await userCollection.insertOne(data);
      res.json(result);
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Server running at port", port);
});
