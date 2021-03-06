const { Client, MessageEmbed, MessageAttachment } = require('discord.js');
const mongoose = require('mongoose');
const ytdl = require('ytdl-core');
const User = require('./schemas/user');
const fetch = require('node-fetch');

const databaseURI = 'mongodb+srv://bot:tiDBpass@123@database-cluster.lkrli.mongodb.net/discord_bot_database?retryWrites=true&w=majority';

mongoose.connect(databaseURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(result => console.log('connected to database'))
    .catch(err => console.log(err));


const bot = new Client();
bot.login(process.env.TOKEN);

const prefix = '!';
let dispatcher = null;

bot.on('ready', () => {
    console.log('Bot is online');
});


bot.on('message', async message => {
    if(!message.guild || message.author.bot) return;
    // if(!message.guild || !message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const cmd = args.shift();

    if(cmd === 'play') {
        if(message.member.voice.channel) {
            let videoURL = args[0];
            const voiceChannel = message.member.voice.channel;

            const connection = await voiceChannel.join();

            const info = await ytdl.getInfo(videoURL);
            const title = info.videoDetails.title;
            message.channel.send(`Now playing **${title}**`);

            const thisStream = ytdl(videoURL, { highWaterMark: 2 ** 25, filter: () => ["251"] });
            dispatcher = connection.play(thisStream);

            dispatcher.on('finish', () => {
                voiceChannel.leave();
                dispatcher = null;
                message.reply('ooo boi, that was fun!')
                .catch(err => console.log(err));
            });

        } else {
            message.reply('you need to join a voice channel first!')
            .catch(err => console.log(err));
        }
    }

    if(cmd === 'pause') {
        if(dispatcher) {
            dispatcher.pause();
        }
        else {
            message.reply('sorry I cannot pause **silence**.')
            .catch(err => console.log(err));
        }
    }

    if(cmd === 'resume') {
        if(dispatcher) {
            dispatcher.resume();
        }
        else {
            message.reply('there is nothing to resume. Use `!play <link>` cmd to play some music.')
            .catch(err => console.log(err));
        }
    }

    if (cmd === 'help') {
        if (!args.length) {
            const infoEmbed = new MessageEmbed()
            .setColor('#B266B2')
            .setTitle('Commands you can use: ')
            .setDescription('```!help``` - Returns the list of available commands\n```!play <link>``` - Plays the audio of the provided YouTube link\n```!pause``` - Pauses the music\n```!resume``` - Resumes the music\n```!create``` - Creates a profile for the user\n```!me``` - Returns information about the user\n```!daily``` - Use this cmd to claim your daily reward\n```!rob @victim``` - Rob a user to get some easy monieeee\n```!meme``` - Blow air from your nostrils with your friends');
            message.channel.send(infoEmbed);
        }
        else {
            return message.reply('I have no idea what that means.')
            .catch(err => console.log(err));
        }
    }

    if(cmd === 'create') {
        User.findOne({id: message.author.id}, (err, doc) => {
            if(err) {
                console.log(err);
            }
            //  Create a new user doc if it does not exist
            else if(!doc)
            {
                const newUser = new User({
                    username: message.author.username,
                    id: message.author.id,
                });
                newUser.save()
                .catch(err => console.log(err));
                message.reply('woohoo! 🥳 use `!me` to check out your brand new shiny✨ profile.')
                .catch(err => console.log(err));
            }
            else {
                message.reply('you already have a profile, use `!me` to check it out.')
                .catch(err => console.log(err));
            }
        })
    }

    if(cmd === 'me') {
        User.findOne({id: message.author.id}, (err, doc) => {
            if(err) {
                console.log(err);
            }
            else if(doc) {
                let prisonStatus = null;
                if(doc.prison.inPrison) {
                    prisonStatus = 'In prison'
                }
                else {
                    prisonStatus = 'Free'
                }
                const userEmbed = new MessageEmbed()
                .setColor('#B266B2')
                .setDescription(
                    `Username: ${doc.username}\nRank: ${doc.rank}\nWallet: ₹ ${doc.wallet}\nStatus: ${prisonStatus}\nLevel: ${doc.level}\nTotal XP: ${doc.totalXp}`
                );
                message.channel.send(userEmbed)
                .catch(err => console.log(err));
            }
            else {
                message.reply('you have not created a profile yet. Use `!create` to make a profile.')
                .catch(err => console.log(err));
            }
        });
    }

    if(cmd === 'daily') {
        User.findOne({id: message.author.id}, (err, doc) => {
            if(err) {
                console.log(err);
            }
            else if(doc) {
                let lastClaimTimestamp = doc.dailyClaimTimestamp;
                let currentTimestamp = new Date().getTime();
                let timePassed = currentTimestamp-lastClaimTimestamp;
                let oneDay = 86400000;
                let timeLeft = oneDay - timePassed;
                if(timeLeft <= 0) {
                    doc.wallet += 100;
                    doc.dailyClaimTimestamp = new Date().getTime();
                    doc.save()
                    .catch(err => console.log(err));
                    message.reply('I just sent 100 rupees to your wallet as a daily gift. Use `!me` to check out how rich you are.')
                    .catch(err => console.log(err));
                }
                else {
                    let time = new Date(timeLeft).toISOString().substr(11, 8);
                    message.reply(`do you want me to go bankrupt? 😥 Please come back after \`${time}\` hours to claim your daily reward.`)
                    .catch(err => console.log(err));
                }
            }
            else {
                message.reply('you need to have a profile to claim daily rewards. Use `!create` cmd to make a profile.')
                .catch(err => console.log(err));
            }
        })
    }

    if(cmd === 'rob') {
        await User.findOne({id: message.author.id}, (err, doc) => {
            if(err) {
                return console.log(err);
            }
            else if(doc) {
                let prisonStartedOn = doc.prison.startedOn;
                let currentTimestamp = new Date().getTime();
                let oneHour = 3600000;
                let timePassed = currentTimestamp - prisonStartedOn;
                let timeLeft = new Date(oneHour - timePassed).toISOString().substr(11, 8);
                if(timePassed < oneHour) {
                    return message.reply(`you are in prison 👮‍♂️. Come back after \`${timeLeft}\` hours to rob someone.`)
                    .catch(err => console.log(err));
                }
                else {
                    doc.prison.startedOn = 0;
                    doc.save()
                    .catch(err => console.log(err));
                }
                let victim = message.mentions.members.first();
                if(victim) {
                    if(victim.user === bot.user) {
                        return message.reply('really 😒 ? You tryna rob me bicc? 😠')
                        .catch(err => console.log(err));
                    }
                    else if(victim.user.bot) {
                        return message.reply('You cannot rob a bot dumbass, they got nothing to steal.')
                        .catch(err => console.log(err));
                    }
                    else if(victim.presence.status === 'online') {
                        User.findOne({id: message.author.id}, (err, doc) => {
                            if(err) {
                                return console.log(err);
                            }
                            else if(doc) {
                                doc.prison.inPrison = true;
                                doc.prison.startedOn = new Date().getTime();
                                doc.save()
                                .catch(err => console.log(err));
                                return message.reply(`you got caught red-handed 🚨. You tried to rob ${victim.user} while they were online, what were you expecting? Have a good time in prison dumbass.`);
                            }
                        });
                    }
                    else {
                        if(Math.round(Math.random())) {
                            let stolenAmount;
                            User.findOne({id: message.author.id}, (err, doc) => {
                                if(err) {
                                    return console.log(err);
                                }
                                else if(doc) {
                                    stolenAmount = Math.round(Math.random() * 200);
                                    doc.wallet += stolenAmount;
                                    doc.save()
                                    .catch(err => console.log(err));
                                    message.reply(`you successfully stole ₹ ${stolenAmount} from ${victim.user}.`)
                                    .catch(err => console.log(err));

                                    User.findOne({id: victim.user.id}, (err, doc) => {
                                        if(err) {
                                            return console.log(err);
                                        }
                                        else if(doc) {
                                            doc.wallet -= stolenAmount;
                                            doc.save()
                                            .catch(err => console.log(err));
                                        }
                                    });
                                }
                            });
                        }
                        else {
                            let fineAmount = 69;
                            User.findOne({id: message.author.id}, (err, doc) => {
                                if(err) {
                                    return console.log(err);
                                }
                                else if(doc) {
                                    doc.prison.startedOn = new Date().getTime();
                                    doc.wallet -= fineAmount;
                                    doc.save()
                                    .catch(err => console.log(err));
                                    return message.reply(`oopsy! you got caught red-handed 🚨. Police fined you ₹ ${fineAmount} and locked you in the prison.`)
                                    .catch(err => console.log(err));
                                }
                            });
                        }
                    }
                }
                else {
                    return message.reply('please mention a valid user you want to rob after the cmd. Like this: `!rob @victim`')
                    .catch(err => console.log(err));
                }
            }
            else {
                return message.reply('you need to have a profile to rob someone. Use `!create` cmd to make a profile.')
                .catch(err => console.log(err));
            }
        });    
    }

    if (cmd === 'meme') {
        fetch(`https://some-random-api.ml/meme`)
        .then(res => res.json())
        .then(data => {
            if (data.image != null) {
                const memeEmbed = new MessageEmbed()
                .setColor('#BF91FF')
                .setImage(data.image);
                return message.channel.send(memeEmbed);
            }
        });
    }

    if(message.channel.id === '764843057967267840') {
        fetch(`https://some-random-api.ml/chatbot?message=${message.content}`)
        .then(res => res.json())
        .then(data => message.channel.send(data.response));
    }

    // if(cmd === 'trigger') {
    //     let mUser = message.mentions.members.first();
    //     mUser.se
    //     let mUserAvatar = mUser.user.avatarURL({ format: 'png' });
    //     const res = await fetch(`https://some-random-api.ml/canvas/triggered?avatar=${mUserAvatar}`);
    //     const triggerEmbed = new MessageEmbed()
    //     .setThumbnail(res.url);
    //     return message.channel.send(triggerEmbed);
    // }

    if(cmd === 'fakeTube') {
        let member = message.mentions.members.first();
        let userAvatar = member.user.avatarURL({ format: 'png' });
        let userName = member.user.username;
        args.shift();
        let fakeComment = args.join(" ");
        
        const fakeCommentImage = await fetch(`https://some-random-api.ml/canvas/youtube-comment?avatar=${userAvatar}&&comment=${fakeComment}&&username=${userName}`);

        const attachment = new MessageAttachment(fakeCommentImage.url, 'image.png');

        const embed = new MessageEmbed()
        .attachFiles(attachment)
        .setImage('attachment://image.png');
        message.channel.send(embed);
    }
});