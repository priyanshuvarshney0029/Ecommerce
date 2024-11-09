const express = require('express');  
const router = express.Router();  
const axios = require('axios');  
const jsSHA = require('jssha');  
const { v4: uuid } = require('uuid');  
const { isLoggedIn } = require('../middleware');  

router.post('/payment_gateway/payumoney', isLoggedIn, async (req, res) => {  
    req.body.txnid = uuid();  
    req.body.email = req.user.email;  
    req.body.firstname = req.user.username;  
    const pay = req.body;  

    const hashString = [  
        process.env.MERCHANT_KEY,  
        pay.txnid,  
        pay.amount,  
        pay.productinfo,  
        pay.firstname,  
        pay.email,  
        '||||||||||',  
        process.env.MERCHANT_SALT  
    ].join('|');  

    const sha = new jsSHA('SHA-512', "TEXT");  
    sha.update(hashString);  
    const hash = sha.getHash("HEX");  

    pay.key = process.env.MERCHANT_KEY;  
    pay.surl = 'http://localhost:5000/payment/success';  
    pay.furl = 'http://localhost:5000/payment/fail';  
    pay.hash = hash;  

    try {  
        const response = await axios.post('https://sandboxsecure.payu.in/_payment', pay, {  
            headers: {  
                'Accept': 'application/json',  
                'Content-Type': 'application/json'  
            },  
            timeout: 20000 // 20 seconds timeout  
        });  

        if (response.status === 200) {  
            res.send(response.data);  
        } else if (response.status >= 300 && response.status <= 400) {  
            res.redirect(response.headers.location);  
        } else {  
            res.status(response.status).send(response.data);  
        }  
    } catch (error) {  
        if (error.code === 'ETIMEDOUT') {  
            console.error("Connection timed out:", error.message);  
            res.status(500).send({  
                status: false,  
                message: 'Request to PayU timed out. Please try again later.',  
            });  
        } else if (error.response) {  
            res.status(error.response.status).send({  
                status: false,  
                message: error.response.data || error.message,  
            });  
        } else {  
            res.status(500).send({  
                status: false,  
                message: error.message,  
            });  
        }  
    }  
});  

// Success route  
router.post('/payment/success', (req, res) => {  
    res.send(req.body);  
});  

// Failure route  
router.post('/payment/fail', (req, res) => {  
    res.send(req.body);  
});  

module.exports = router;
