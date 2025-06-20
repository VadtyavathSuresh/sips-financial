//Declarations  
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcrypt'); 
const cookieParser = require('cookie-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');
const moment = require('moment');
/////////////////////////////Use////////////////////////////////////
app.use(cors())
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser( "4c8e9e8fb6e93f6456f3dc5f91794f27ba87ac63e09456119b8a792d4b172b5f"
));
app.use(
    session({
      secret: "4c8e9e8fb6e93f6456f3dc5f91794f27ba87ac63e09456119b8a792d4b172b5f", 
      resave: false,
      saveUninitialized: true,
    })
  );
function isAuthenticated(req, res, next) {
    if (req.session.user) {
      return next();
    } else {
      return res.send(`
        <script>
          alert("Please log in to access this page!");
          window.location.href = "/";
        </script>
      `);
    }
  }
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '703678',
    database: 'sipsdb'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL Connected...');
});
 // Send OTP endpoint
  let transporter = nodemailer.createTransport({
    service: 'gmail',
      auth: {
        user: 'v.suresh7034@gmail.com', // your email
        pass: 'tiaf dhed ujxc oihv' // your app password
    }
});
  app.post("/sendOtp", (req, res) => {
    const { Email,Otp } = req.query;  // Email passed in request body
  
    if (!Email) {
      return res.status(400).send("Email is required");
    }
  
    // Setup email data
    const mailOptions = {
      from: "sips",  // sender address
      to: Email,                             // recipient's email
      subject: "Your OTP Code From  Sips",              // Subject line
      text: `${Otp}`,      // OTP in text body
    };
  
    // Send the OTP via email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send('Error sending email');
      }
      console.log('Message sent: %s', info.messageId);
      res.status(200).json({ status: "success", message: "OTP sent successfully" });

    });
  });

app.get("/getEmails",(req,res)=>{

    db.query('SELECT Email FROM Users', (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ error: 'Error fetching data' });
        }
        
        // Extract only email values into an array
        const emailArray = results.map(row => row.Email);
        
        res.json(emailArray); // Send only the array of emails
    }); 
})

app.get('/ResetPassword', async (req, res) => {
    const { Email, Password } = req.query;

    if (!Email || !Password) {
        return res.status(400).json({ message: 'Email and new password are required' });
    }

    try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(Password, 10);

        // Update the password in the database
        const query = 'UPDATE users SET Password = ? WHERE Email = ?';
        db.query(query, [hashedPassword, Email], (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                return  res.send(`
                    <script>
                      alert("Internal server error!");
                      window.location.href = "/";
                    </script>
                  `);
               
            }

            if (result.affectedRows === 0) {
                return   res.send(`
                    <script>
                      alert("No User Found With this Email!");
                      window.location.href = "/";
                    </script>
                  `);
                 
            }

           res.redirect("/");
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
})



/////////////////////////////////////////////////////////////////////
app.get('/', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
          return res.send('Error logging out');
        }});
    res.sendFile(path.join(__dirname, '/Login.html'));
});
const PORT=process.env.PORT||2021;
app.listen(PORT,()=>{

    console.log("SUCCESFUL")
})

app.get('/UserData', async (req, res) => {
    try {
        // SQL Query to join Orders and Clients to get ClientName
        const query = "select * from Users";
        
        const [Users] = await db.promise().query(query);
        
        res.json(Users); // Return data with ClientName
    } catch (error) {
        console.error('Error fetching order EMI history:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.get('/signup',(req,res)=>{


    const {UserName,Password,Email}=req.query;
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(Password, salt, function(err, hash) {
            const sql = `INSERT INTO Users (UserName,Password,Email,Access)
            VALUES (?, ?,?,1)`;

db.query(sql, [UserName,hash,Email], (err) => {
   if (err) {
       console.error('Error inserting record:', err);
       res.status(500).send('Error inserting record');
       return;
   } 
        });
    });

        console.log('Record inserted');
        res.redirect('/')
    });
})


app.get('/check', async (req, res) => {
    const { username, password } = req.query;
  
    try {
      // Query the database for the user
      db.query('SELECT * FROM users WHERE UserName = ?', [username], async (err, result) => {
        if (err) {
          console.error('Error querying the database:', err);
          return res.status(500).send('Database error');
        }
  
        const user = result[0];
  
        if (!user) {
          // Invalid username
          return res.send(`
            <script>
              alert("Invalid username or password!");
              window.location.href = "/";
            </script>
          `);
        }
  
        // Compare the provided password with the hashed password
        const isMatch = await bcrypt.compare(password, user.Password);
  
        if (isMatch) {
          // Set session for user
          req.session.user = username;
  
          // Redirect to home
          return res.redirect("/Home");
        } else {
          // Invalid password
          return res.send(`
            <script>
              alert("Invalid username or password!");
              window.location.href = "/";
            </script>
          `);
        }
      });
    } catch (err) {
      console.error('Error during user authentication:', err);
      res.status(500).send('Internal Server Error');
    }
  });

 app.get('/Home', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '/Home.html'));
});