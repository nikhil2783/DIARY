require('dotenv').config();
const express=require('express');
const cors=require('cors');
const bcrypt=require('bcrypt');
const mysql=require('mysql2')
const path=require("path")

const app=express();
app.use(cors())
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(express.static(path.join(__dirname,"../frontend")))

const connection=mysql.createConnection({
    host:process.env.DB_HOST,
    port: process.env.DB_PORT,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME,
    ssl: {
    rejectUnauthorized: false
  }
});
connection.connect((err)=>{
    if(err){
        console.log("Error in connecting Database",err)
        return
    }
    console.log("Successfully connected to Database")
})
app.post("/registerUser",async(req,res)=>{
    const {email,password}=req.body
    try{
        const hashedPassword=await bcrypt.hash(password,10)
        connection.query("select count(EmailID) as count from Users where EmailID=?",[email],(err,result)=>{
            if(err){
                res.status(500).send("Unable to register")
                console.log(err)
                return
            }
            if(result[0].count>0){
                res.status(409).send("Email already registered")
                return
            }
            connection.query("insert into Users(EmailID,HashedPassword) values(?,?)",[email,hashedPassword],(err,results)=>{
                if(err){
                    res.status(500).send('Unable to register')
                    console.log(err)
                    return
                }
                res.sendStatus(200)
                console.log("Successfully Registered")
            })
        })
    }
    catch(err){
        console.error(err)
        res.status(500).send("error while hashing")
    }
})

app.post("/userLogin",(req,res)=>{
    const {email,password}=req.body; 
    connection.query("select ID,HashedPassword from Users where EmailID=?",[email],async(err,result)=>{
        if(err){
            console.log(err)
            res.status(500).send('DB error')
            return
        }
        if (result.length === 0) {
            return res.status(401).send("Invalid email");
        }
        const hashedPassword=result[0].HashedPassword
        const userID=result[0].ID;
        let response=await bcrypt.compare(password,hashedPassword)
        if(response){
            res.status(200).json({userID:userID})
        }
        else{
            res.status(401).send("Invalid credentials")
        }
    })
})
app.post("/newPost",async(req,res)=>{
    const {postTitle,postDescription,userID}=req.body;
    connection.query("insert into Posts(UserID,postTitle,postDescription) values(?,?,?)",[userID,postTitle,postDescription],async(err,result)=>{
        if(err){
            res.status(500).send("unable to post")
            console.log(err)
            return
        }
        console.log("Successfully new Post added")
        res.sendStatus(200)
    })
})
app.post("/feedPost",async(req,res)=>{
    const {userID}=req.body
    connection.query("select ID,postTitle,postDescription from Posts where UserID=? order by ID desc",[userID],(err,results)=>{
        if(err){
            console.log(err)
            return res.status(500).send("Unable to fetch Posts")
        }
        return res.json(results);
    })
})
app.get("/getPost",(req,res)=>{
    const {id}=req.query
    connection.query("select ID,postTitle,postDescription,UserID from Posts where ID=?",[id],(err,results)=>{
        if(err){
            console.log(err)
            return res.status(500).send("Unable to fetch post")
        }
        if(results.length==0){
            return res.status(404).send("Post not found")
        }
        return res.json(results[0])
    })
})

app.post("/updatePost",(req,res)=>{
    const {postID,postTitle,postDescription}=req.body
    connection.query("update Posts set postTitle=?, postDescription=? where ID=?",[postTitle,postDescription,postID],(err,results)=>{
        if(err){
            console.log(err)
            return res.status(500).send("Unable to update post")
        }
        return res.sendStatus(200);
    })
})

app.post("/deletePost",(req,res)=>{
    const {postID}=req.body;
    connection.query("delete from Posts where ID=?",[postID],(err,results)=>{
        if(err){
            console.log(err)
            return res.status(500).send("Unable to delete Post")
        }
        return res.sendStatus(200);
    })
})
app.get("/",(req,res)=>{
    res.sendFile(path.join(__dirname,"../frontend/Registration.html"))
})
const PORT=process.env.PORT || 3000
app.listen(PORT,()=>{
    console.log(`server started on port ${PORT} ...`)
});