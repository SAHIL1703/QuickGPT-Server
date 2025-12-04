import imagekit from "../config/imagekit.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import axios from 'axios'
import openai from "../config/openAI.js";
//Text-Based AI Chat Message Controller
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id;
        //Check Credits
        if(req.user.credits < 1){
            return res.json({success : false , message : "You dont have the enough credits to use this features"})
        }

        const { chatId, prompt } = req.body;

        const chat = await Chat.findOne({ userId, _id: chatId });
        chat.messages.push({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false
        })

        const { choices } = await openai.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                {
                    role: "user",
                    content: prompt,
                }
            ],
        });

        const reply = {
            ...choices[0].message,
            timestamp : Date.now(),
            isImage : false
        }
        res.json({success:true,reply})

        chat.messages.push(reply)
        await chat.save()

        await User.updateOne({_id : userId},{$inc: {credits : -1}});

        

    } catch (error) {
        res.json({success : false , message : error.message});
    }
}


//Image Generation Message Controller
export const imageMessageController = async(req,res)=>{
    try {
        const userId = req.user._id;
        //Check Credits
        if(req.user.credits < 2){
            return res.json({success : false , message : "You dont have the enough credits to use this features"})
        }

        const {prompt , chatId , isPublished} = req.body;
        //Find Chat
        const chat = await Chat.findOne({userId,_id : chatId});

        //Push user message
        chat.messages.push({
            role : 'user',
            content : prompt,
            timestamp : Date.now(),
            isImage : false
        });

        //Encode the Prompt 
        const encodedPrompt = encodeURIComponent(prompt);

        //Contruct ImageKit AI generation URL
        const generatedImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/quickgpt/${Date.now()}.png?tr=w-800,h-800`;

        const aiImageResponse = await axios.get(generatedImageUrl , {responseType : "arraybuffer"});

        //Convert Image into the base_64
        const base64Image = `data:image/png;base64,${Buffer.from(aiImageResponse.data).toString('base64')}`

        //Upload to imagekit media library
        const uploadResponse = await imagekit.upload({
            file : base64Image,
            fileName : `${Date.now()}.png`,
            folder : 'quickgpt'
        })

        const reply = {
            role : 'assistant',
            content : uploadResponse.url,
            timestamp : Date.now(),
            isImage : true,
            isPublished
        }
        res.json({success : true , reply})

        chat.messages.push(reply);
        await chat.save();

        //Deduct Credit by Two
        await User.updateOne({_id : userId} , {$inc : {credits : -2}});

    } catch (error) {
        
    }
}
