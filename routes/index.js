const express = require('express')
const router = express.Router()
const mongoose = require('mongoose');
const stripe = require('stripe')('sk_test_51JJIqEB7xOd0avEgcpHRiiczUzqqgaucUJfzaEMxb2jxybky1KHKOShWJFTc8cuMZVeHq5EpMPHvbEqvquFLnm9C00Y1JV6aJD');
const User = require('./../models/user')

router.get('/', (req,res,next) => {
    res.render('index')
})

router.get('/clientsend', (req,res,next) => {
    const query = req.query
    res.render('publicFiles/clientSend', {
        postStatus: query.postStatus
    })
})

// Visiting this route logs the user out

router.get('/logout', function(req, res, next) {
    const username = req.user.username
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect(`/login`);
    });
});
// When you visit http://localhost:3100/login, you will see "Login Page"
router.get('/login', (req, res, next) => {
    res.render('login')
});
 
 // When you visit http://localhost:300/register, you will see "Register Page"
router.get('/register', (req, res, next) => {
    res.render('register')    
});

router.get('/pricing', (req, res, next) => {
    res.render('pricing')    
});

router.post('/pricing/basic', async(req, res, next) => {
    const priceId = 'price_1JJJAlB7xOd0avEgxZrTkHy7';

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
            {
            price: priceId,
            // For metered billing, do not pass quantity
            quantity: 1,
            },
        ],
        // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
        // the actual Session ID is returned in the query parameter when your customer
        // is redirected to the success page.
        success_url: 'http://localhost:2000/success',
        cancel_url: 'http://localhost:2000/cancel',
    });
    res.redirect(303, session.url)
    console.log(session.id)  
});



//passports redirects
router.get('/login-success', (req, res, next) => {
    const username = req.user.username
    res.redirect(`/${username}/dashboard`)
});

router.get('/login-failure', (req, res, next) => {
    res.send('You entered the wrong password.');
});




/*----   USERNAME BASIC ROUTES   ------*/

router.get('/:username/dashboard', async(req, res, next) => {
    // This is how you check if a user is authenticated and protect a route.  You could turn this into a custom middleware to make it less redundant
    if (req.isAuthenticated() && (req.params.username === req.user.username )) {
        
        var user = req.user
        var one_day = 1000 * 60 * 60 * 24;
        var cd = new Date()
        var trial = user.trial

        if (cd.getTime() >= trial.start.getTime() && cd.getTime() < trial.end.getTime()) {
            if ((trial.end.getTime() - cd.getTime()) < one_day)
                freeTrialEndDate = `${Math.ceil((trial.end.getTime() - cd.getTime()) / (one_day / 24) )} hour(s) left!`
            else
                freeTrialEndDate = `${Math.ceil((trial.end.getTime() - cd.getTime()) / one_day)} day(s) left! `
        } else if ((trial.end.getTime() - cd.getTime()) <= 0) {
                // add the if that checks if the user has paid the subscription after the trial period else clg 'trial expired'
                freeTrialEndDate = "Trial expired"
                await user.updateOne({_id: user._id}, {$set: {trial: {status: "expired"}}})
        }
        console.log((trial.end.getTime() - cd.getTime()) / one_day);
        res.render('dashboard',{
            user: user,
            freeTrialEndDate: freeTrialEndDate
        });
    } else {
        res.send('<h1>You are not authenticated</h1><p><a href="/login">Login</a></p>');
    }
});

router.post('/:username/dashboard/forms/view/:title/messages', async (req,res, next) => {
    const user = await User.findOne({username: req.params.username})
    const form = user.forms.find(form => form.title === req.params.title)
    form.messages.push({
        text: req.body.text,
        clientSenderName: req.body.clientSenderName,
        clientSenderEmail: req.body.clientSenderEmail,
        formTarget: req.params.title
    })
    try {
        await user.save();
        res.redirect('/clientSend?postStatus=success')
    } catch (e) {
        res.redirect('/clientSend?postStatus=failed')
        console.log(e);
    }
})

router.all('/:username/dashboard', async(req, res, next) => {
    if (req.isAuthenticated() && (req.params.username === req.user.username )) {
        var user = req.user

        var one_day = 1000 * 60 * 60 * 24;
        var cd = new Date()

        var trial = user.trial

        if (cd.getTime() >= trial.start.getTime() && cd.getTime() < trial.end.getTime()) {
            if ((trial.end.getTime() - cd.getTime()) < one_day)
                freeTrialEndDate = `${Math.ceil((trial.end.getTime() - cd.getTime()) / (one_day / 24) )} hour(s) left!`
            else
                freeTrialEndDate = `${Math.ceil((trial.end.getTime() - cd.getTime()) / one_day)} day(s) left! `
            return next()
        } else if ((trial.end.getTime() - cd.getTime()) <= 0) {
                // add the if that checks if the user has paid the subscription after the trial period else clg 'trial expired'
                freeTrialEndDate = "Trial expired"
                //await user.updateOne({_id: user._id}, {$set: {trial: {status: "expired"}}})
                user.trial.status = "expired"
                await user.save();
                //res.send('upgrade in order to continue')
                return next()
        }
    } else {
        res.send('<h1>You are not authenticated</h1><p><a href="/login">Login</a></p>');
    }
});

router.get('/:username/settings/plans', (req,res) => {

    res.render('dash/settings/plans', {
        user: req.user
    })
})

router.get('/:username/settings/plans/:title/success', async(req,res) => {
    if(!req.query.session_id){
        res.redirect('/' + req.user.username + '/settings/plans')
    }

    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

    let user = req.user
    if( req.params.title === 'basic' ){
        user.plan.messagesNr = 100 
    }
    else if( req.params.title === 'plus' ){
        user.plan.messagesNr = 500 
    }

    user.plan.title = req.params.title
    user.plan.isActive = true
    user.plan.price = session.amount_total
    user.activePlan = req.params.title
    user.activeSubscriptionId = session.subscription
    try {
        user = await user.save()
    } catch (error) {
        console.log(error);
    }
    res.redirect('/' + req.user.username + '/settings/plans')
    
})

router.get('/:username/settings/billings', async(req,res) => {
    
    res.render('dash/settings/billings', {
        user: req.user
    })
})

router.post('/:username/settings/billings', async(req,res) => {
    const session = await stripe.billingPortal.sessions.create({
        customer: req.user.customerId,
        return_url: `${process.env.SERVER_URL}/${req.user.username}/dashboard`,
    });

    res.redirect(session.url);
})

router.post('/:username/settings/plans/basic', async(req,res) => {
    var user = req.user
    const deleteActiveSubscription = await stripe.subscriptions.del(
        user.activeSubscriptionId
    );
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_1JJJAlB7xOd0avEgxZrTkHy7',
            quantity: 1,
          },
        ],
        customer: user.customerId,
        success_url: `${process.env.SERVER_URL}/${req.user.username}/settings/plans/basic/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SERVER_URL}/${req.user.username}/settings/plans`,
    });
    req.user.activePlan = session.subscription
    console.log(session.subscription);
    await req.user.save()
    res.redirect(303, session.url)
})

router.post('/:username/settings/plans/plus', async(req,res) => {
    const user = req.user
    const deleteActiveSubscription = await stripe.subscriptions.del(
        user.activeSubscriptionId
    );
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_1JJJBjB7xOd0avEgT0TF9hri',
            quantity: 1,
          },
        ],
        customer: user.customerId,
        success_url: `${process.env.SERVER_URL}/${user.username}/settings/plans/plus/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SERVER_URL}/${user.username}/settings/plans`,
    });
    user.activePlan = session.subscription
    console.log(session.subscription);
    await user.save()
    res.redirect(303, session.url)

})

router.all('/:username/dashboard/*', async(req, res, next) => {
    if (req.isAuthenticated() && (req.params.username === req.user.username )) {
        console.log(req.user.trial.status + ' ' + req.user.plan.isActive);
        if(req.user.trial.status === 'expired' && (req.user.activePlan === null || req.user.plan.isActive === false)) {
            const upgradeLink = `/${req.user.username}/settings/plans`
            res.send(`Trial expired. In order to continue working with messages, please <a href="${upgradeLink}">Select</a> your plan.`)
        } else next()
    } else {
        res.send('<h1>You are not authenticated</h1><p><a href="/login">Login</a></p>');
    }
});

/*router.all('/:username/dashboard/forms/*', async(req, res, next) => {
    const msgCount = await mongoose.model(`${req.user.username}dbs`, InputSchema).countDocuments({});
    if(msgCount > 100 && req.user.activePlan === 'basic' ) {
        res.send('You need to upgrade')
    } else {
        return next()
    }
}); */


module.exports = router