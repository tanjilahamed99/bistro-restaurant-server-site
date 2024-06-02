const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("welcome to my server site");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { default: axios } = require("axios");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8mn4lkn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const menuCollection = client.db("bistro").collection("menu");
    const cartsCollection = client.db("bistro").collection("carts");
    const usersCollection = client.db("bistro").collection("users");

    // json web token related apis
    app.post("/jwt", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.TOKEN_SECRET, {
        expiresIn: "1h",
      });
      return res.send({ token });
    });

    // verify token
    const verifyToken = (req, res, next) => {
      const token = req.headers.authorization?.split(" ")[1];
      // console.log(token)
      if (!token) {
        return res.status(401).send({ message: "unauthorized" });
      }

      jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized" });
        }
        req.decoded = decoded;
      });
      next();
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded?.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);

      const isAdmin = user.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden" });
      }
      next();
    };

    // admin related apis
    app.get("/dashboard/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const tokenEmail = req.decoded?.email;
      if (email !== tokenEmail) {
        return res.status(403).send({ message: "unauthorized" });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);

      let isAdmin = false;
      if (user) {
        isAdmin = user.role === "admin";
      }
      return res.send({ isAdmin });
    });

    // user related apis
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      return res.send(result);
    });

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = newUser.email;
      // filtering the email for do not duplicate this
      const filter = { email: email };
      const isExist = await usersCollection.findOne(filter);
      if (isExist) {
        return res.send({ message: "user already exist" });
      }

      const result = await usersCollection.insertOne(newUser);
      return res.send(result);
    });

    app.patch("/user/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, updatedDoc);
      return res.send(result);
    });

    app.delete("/user/:id", verifyToken, verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      return res.send(result);
    });

    app.post("/otp", async (req, res) => {
      const { num } = req.body;
      const otp = Math.floor(100000 + Math.random() * 900000);
      const message = `Your OTP is ${otp}`;
      console.log(message, data);

      try {
        const response = await axios.post(
          "https://api.textlocal.in/send/",
          null,
          {
            params: {
              apikey: "Nzg0ZDQxNTA0MTQ5NTA2MzVhNjU0MTQzNzc0ODZhMzY=",
              numbers: num,
              message: message,
              sender: "",
            },
          }
        );
        if (response.data.status === "success") {
          res.json({ success: true, otp: otp });
        } else {
          res.status(500).json({ success: false, error: response.data.errors });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // menu related apis
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      return res.send(result);
    });

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      return res.send(result);
    });

    app.patch("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateItem = req.body;
      const updateDoc = {
        $set: {
          name: updateItem.name,
          recipe: updateItem.recipe,
          price: updateItem.price,
          image: updateItem.image,
          category: updateItem.category,
        },
      };
      const result = await menuCollection.updateOne(query, updateDoc);
      return res.send(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const newMenusData = req.body;
      const result = await menuCollection.insertOne(newMenusData);
      res.send(result);
    });

    app.delete("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      return res.send(result);
    });

    // carts related apis
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      return res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const cartData = req.body;
      const result = await cartsCollection.insertOne(cartData);
      return res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      return res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
