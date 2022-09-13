const express = require('express')
const router = express.Router()
const mongoose = require('mongoose');
const nodemailer = require('nodemailer')
const fs = require('fs')

const User = require ('./../models/user')

const Stripe = require('stripe');
const { truncate } = require('fs');
const stripe = Stripe('sk_test_51JJIqEB7xOd0avEgcpHRiiczUzqqgaucUJfzaEMxb2jxybky1KHKOShWJFTc8cuMZVeHq5EpMPHvbEqvquFLnm9C00Y1JV6aJD');

/* USER FORM ROUTES */
/*
        |
        |
        |
       < >
*/
router.get('/messages', async(req,res) => {
    const user = req.user
    const forms = user.forms
    res.render('dash/forms/allMessages', {
        user: user,
        forms: forms
    })
})

router.get('/forms', async (req,res) => {
    const forms = req.user.forms /*|| "no forms"*/
    res.render('dash/forms/forms', {
        user: req.user,
        forms: forms
    })
})


router.get('/forms/new', async (req,res) => {
    res.render('dash/forms/newForm', {
        user: req.user
    })
})

router.put('/forms', async (req,res, next) => {
    const user = req.user
    user.forms.push({title: req.body.formTitle})
    try {
        console.log(user)
        await user.save();
        res.redirect(`/${req.user.username}/dashboard/forms`)
    } catch (e) {
        res.redirect(`/${req.user.username}/dashboard/forms/new`)
        console.log(e);
    }
})



router.get('/forms/view/:title', async (req,res) => {
    const allForm = req.user.forms
    const form = allForm.find(form => form.title === req.params.title)
    var limitMsg = null
    if(form.messages.length > req.user.plan.messagesNr) { limitMsg = 'Message limit exceeded'}
    res.render('dash/forms/showForm', {
        form: form,
        user: req.user,
        limitMsg: limitMsg
    })
})
router.post('/forms/view/:title/deleteForm', async(req,res) => {
    const allForm = req.user.forms
    const form = allForm.find(form => form.title === req.params.title)
    if(!form ){
        res.status(404).render('layouts/404')
    } else {
        allForm.splice(allForm.indexOf(form), 1)
        await req.user.save()
        res.redirect('/' + req.user.username + '/dashboard/forms')
    }
})

router.all('/forms/view/:title/*', async(req,res, next) => {
    const allForm = req.user.forms
    const form = allForm.find(form => form.title === req.params.title)
    const upgradeLink = `/${req.user.username}/settings/plans`
    if(form.messages.length > req.user.plan.messagesNr) res.send(`Message limit exceeded. In order to continue working with messages, please <a href="${upgradeLink}">Upgrade</a> your plan.`)
    else next()
})

router.get('/forms/view/:title/all-emails', async (req,res) => {
    const allForm = req.user.forms
    const form = allForm.find(form => form.title === req.params.title)

    res.render('dash/forms/formsEmails', {
        user: req.user,
        form: form,
        msgs: msgs
    })
})

/* USER FORM MESSAGES */
/*
        |
        |
        |
       < >
*/

router.get('/forms/view/:title/messages', async(req,res) => {
    const allForm = req.user.forms
    const form = allForm.find(form => form.title === req.params.title)
    if( !form ){ 
        res.status(404).render('errors/404')
    } else {
        res.render('dash/forms/messages', {
            user: req.user,
            form: form
        })
    }
})



router.get('/forms/view/:title/messages/:msgId', async(req,res) => {
    const allForm = req.user.forms
    const form = allForm.find(form => form.title === req.params.title)
    const msg = form.messages.find(msg => msg.id === req.params.msgId)
    if( !msg || !form ){
        res.status(404).render('errors/404')
    } else {
        res.render('dash/forms/showMessage', {
            msg: msg,
            user: req.user,
            form: form
        })
    }
})



router.get('/forms/view/:title/messages/:msgId/delete', async(req,res) => {
    const allForm = req.user.forms
    const form = allForm.find(form => form.title === req.params.title)
    const msg = form.messages.find(msg => msg.id === req.params.msgId)
    if( !msg || !form ){
        res.status(404).render('errors/404')
    } else {
        form.messages.splice(form.messages.indexOf(msg), 1)
        await req.user.save()
        res.redirect('/' + req.user.username + '/dashboard/forms/view/' + form.title + '/messages')
    }
})

router.get('/forms/view/:title/messages/:msgId/send', async(req,res) => {
    const allForm = req.user.forms
    const form = allForm.find(form => form.title === req.params.title)
    const msg = form.messages.find(msg => msg.id === req.params.msgId)
    if( !msg || !form ){
        res.status(404).render('errors/404')
    } else {
        res.render('dash/forms/sendEmailMessage', {
            msg: msg,
            user: req.user,
            form: form
        })
    }
})

router.post('/forms/view/:title/messages/:msgId/sendemail', async(req,res) => {
    const usernameParam = req.user.username
    
    const allForm = req.user.forms
    const form = allForm.find(form => form.title === req.params.title)
    const msg = form.messages.find(msg => msg.id === req.params.msgId)
    const settingsOptions = usernameParam.settingsOptions
    let sentMessage = req.body.sendMessage

    if( !msg || !form ){
        res.status(404).render('errors/404')
    } else {
        const userEmailParam = msg.clientSenderEmail
        let transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: 'liviujmk@gmail.com', // generated ethereal user
                pass: 'fbzpacvfcnmbvhzi', // generated ethereal password
            },
        });
        
        // send mail with defined transport object
        let info = await transporter.sendMail({
            from: ' "Msg replier" <liviujmk@gmail.com> ', // sender address
            to: userEmailParam, // list of receivers
            subject: "Hello ✔", // Subject line
            text: sentMessage, // plain text body
            html: `<h1>${sentMessage}</h1>
                    <br>
                    <br>`, // html body
        });
        transporter.sendMail(info, (error, info) => {
            if (error) {
                console.log('Error occurred');
                console.log(error.info);
                return process.exit(1);
            }
    
            console.log('Message sent successfully!');
        });

        res.send(`Message sent successfully! ${sentMessage}`)
    }
})



/* USER FORM SETTINGS */
/*
        |
        |
        |
       < >
*/



/*
router.get('/settings/emails', async(req,res) => {
    const settingsOptions = await mongoose.model(`${req.user.username}-EmailPref`, SettingsSchema).findOne({email_title: 'EmailFooter1'})
    res.render('dash/settings/emails',{
        user: req.user,
        settingsOptions: settingsOptions
    })
})
router.put('/settings/emails', async(req,res) => {
    const edit = req.body.emailPref
    let settingsOptions = await mongoose.model(`${req.user.username}-EmailPref`, SettingsSchema).findOne({email_title: 'EmailFooter1'})
    settingsOptions.email_html = edit
    settingsOptions = await settingsOptions.save()
    res.send(`<h3>${edit}</h3>`)
})*/

module.exports = router