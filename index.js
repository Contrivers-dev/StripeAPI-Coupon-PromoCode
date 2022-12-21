const stripe = require('stripe')('sk_test_51MEVhADbUf1JnYG4w2YgTcDHlntvjAp595jfL01lA51Nn43ULcVyEn3k9BYFXS7hDjytaYfDYkzNG2q3dPqDV9K500OY7npC1R');

const data = require("./Data/data.json")
const express = require('express')
const bp = require('body-parser')
const Bottleneck = require('bottleneck');

var pId = "prod_MyoM18y2eH96P7";

const app = express()
const port = 3000

app.use(bp.json())

app.get('/', (req, res) => {
    res.send("<h1>HOME PAGE</h1>")
})

// CREATES A PRODUCT
app.post('/createProduct', async (req, res) => {
    const paymentType = req.body.paymentType;
    const interval = req.body.interval;
    const priceAmount = req.body?.amount;
    const prodName = req.body.prodName;

    // console.log(prodName);

    const product = await stripe.products.create({
        name: prodName,
        metadata: { paymentType: `${paymentType ? paymentType : 'monthly'}` },
        default_price_data: {
            currency: 'usd',
            unit_amount: priceAmount ? priceAmount * 100 : 2900,
            recurring: { interval: `${interval ? interval : 'month'}` },
        }
    });
    console.log(product);
    res.status(200).send(req.body);
})

// CREATES A PRICE FOR AN EXISTING PRODUCT
app.post('/newPrice', async (req, res) => {
    const prodId = req.body.prodId;
    const paymentType = req.body.paymentType;
    const priceAmount = req.body.amount;

    const price = await stripe.prices.create({
        unit_amount: priceAmount ? priceAmount * 100 : 290000,
        currency: 'usd',
        metadata: { paymentType: `${paymentType ? paymentType : 'oneTime'}` },
        product: `${prodId}`,
    });

    res.status(200).send(req.body);
})

// CREATES A COUPON WHICH CAN BE APPLIED ON ALL PRODUCTS
// app.post('/createCoupon', async (req, res) => {
//     // const couponName = req.query?.couponName;
//     const percentOff = req.query?.percentOff;

//     const coupon = await stripe.coupons.create({
//         // name: `${couponName ? couponName : "winter50"}`,
//         percent_off: `${percentOff ? percentOff : "50"}`,
//         duration: 'once'
//     });

//     console.log(coupon);
//     res.status(200).send('ok');
// })

// CREATES A COUPON FOR A SPECIFIC PRODUCT (:prodId)
app.post('/createCoupon', async (req, res) => {
    const prodId = req.body.prodId;
    const couponName = req.body.couponName;
    const percentOff = req.body.percentOff;
    const duration = req.body.duration;

    const coupon = await stripe.coupons.create({
        name: `${couponName ? couponName : "StackBeta"}`,
        percent_off: `${percentOff ? percentOff : 10}`,
        duration: `${duration ? duration : 'forever'}`,
        applies_to: { products: [`${prodId}`] }
    });

    console.log(coupon);
    res.status(200).send('ok');
})

// Retrive
app.get("/getCoupon", async (req, res) => {
    const coupon = await stripe.coupons.retrieve('s1QgayFm', {
        expand: ['applies_to'],
    });
    console.log(coupon);
    res.send('ok')
})

// CREATES A PROMO CODE FOR A CERTAIN COUPON
// CAN BE USED TO CREATE MULTIPLE PROMO CODES FOR A SINGLE COUPON
// :couponId
app.post('/createPromo', async (req, res) => {
    const couponId = req.body.couponId;

    // NOT OPTIIMIZED, DUE TO STRIPE LIMITER
    // let promises = [];
    // data.forEach(function (item) {
    //     promises.push(stripe.promotionCodes.create({
    //         coupon: couponId,
    //         code: `${item.promocodes}`,
    //         metadata: { paymentType: item.paymentType },
    //         max_redemptions: 1
    //     }));
    // })

    ////////////////// MANUAL //////////////////
    // let count = 0;
    // let chunks = (data, noOfChunks) => {
    //     let promises = [];
    //     return new Promise((resolve, reject) => {
    //         for (let i = count; i < noOfChunks; i++) {
    //             promises.push(stripe.promotionCodes.create({
    //                 coupon: couponId,
    //                 code: `${data[i].promocodes}`,
    //                 metadata: { paymentType: data[i].paymentType },
    //                 max_redemptions: 1
    //             }))
    //             count++
    //         }
    //         resolve(promises)
    //     })
    // }

    // chunks(data, 10).then(async (promises) => {
    //     const promotionCode = await Promise.all(promises)
    //     console.log(promotionCode);
    // })

    ////////////////// MANUAL 2 //////////////////
    let chunks = async (data, noOfChunks) => {
        let promises = [];
        for (let i = 0; i < data.length; i += noOfChunks) {
            const chunk = data.slice(i, (i + noOfChunks));
            chunk.map((c) => {
                promises.push(stripe.promotionCodes.create({
                    coupon: couponId,
                    code: `${c.promocodes + 'new'}`,
                    metadata: { paymentType: c.paymentType },
                    max_redemptions: 1
                }))
            })

            const promotionCode = await Promise.all(promises)
            console.log(promotionCode);
            if (promotionCode) {
                promises = []
            }
        }
    }

    chunks(data, 10)

    // const limiter = new Bottleneck({ maxConcurrent: 10 });
    // const tasks = data.map((item) => limiter.schedule(
    //     () => stripe.promotionCodes.create({
    //         coupon: couponId,
    //         code: `${item.promocodes}`,
    //         metadata: { paymentType: item.paymentType },
    //         max_redemptions: 1
    //     })));

    // const promotionCode = await Promise.all(tasks);

    // console.log(promotionCode);
    res.status(200).send('ok');
})

app.get('/checkPromo', async (req, res) => {
    //VARIABLES
    let valid;
    let off;
    let offType;

    //GETTING DATA FROM BODY
    const code = req.body.reqCode;
    const planType = req.body.planType;

    // STRIPE API CALLS
    const promotionCode = await stripe.promotionCodes.list({ code: code, expand: ['data.coupon.applies_to'] });

    const product = await stripe.products.retrieve(pId);

    // EXTRACTING DATA FROM API RESPNOSES
    const promoPlanType = promotionCode.data[0].metadata.paymentType;
    const prodId = product.id;

    // CHECKING
    if (promoPlanType == planType && promotionCode.data[0].coupon.applies_to.products[0] == prodId) {
        valid = true;
    }

    if (valid) {
        if (promotionCode.data[0].coupon.amount_off) {
            off = promotionCode.data[0].coupon.amount_off / 100;
            offType = "fixed";
        } else {
            off = promotionCode.data[0].coupon.percent_off;
            offType = "percent";
        }
    }

    // console.log("Promo:", promotionCode);
    // console.log("Coupon:", promotionCode.data[0].coupon);
    // console.log("Product:", product);
    // console.log("PromoCode-applies_to: ", PromotionCodeAppliesTo.applies_to.products[0]);

    res.status(200).send({
        valid,
        off,
        offType,
        message: valid ? "Promo Code Applied" : "Invalid Code. Try again."
    });
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})