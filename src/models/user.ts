import mongoose from "mongoose";
import validator from "validator"; // used for validating email.

interface IUser extends Document {
    _id: string,
    name: string,
    email: string,
    photo: string,
    role: "admin" | "user",
    gender: "male" | "female",
    dob: Date,
    createdAt: Date, // Because of timestamps, this will also come.
    updatedAt: Date // Because of timestamps, this will also come.
    age: number // virtual attribute.
}

const schema = new mongoose.Schema(
    {
        /*
        
            We are generating our own id becoz authentication will be done using firbase and firbase will generate it's own id, so we will store that id;
        
        */
        _id: {
            type: String,
            required: [true, "Please enter Id"] // if id is not given, then this message will come.
        },
        name: {
            type: String,
            required: [true, "Please enter name"]
        },
        email: {
            type: String,
            unique: [true, "Email already exists"],
            required: [true, "Please enter email"],
            validate: validator.isEmail
        },
        photo: {
            type: String,
            required: [true, "Please enter photo"]
        },
        role: {
            type: String,
            enum: ["admin", "user"],
            default: "user"
        },
        gender: {
            type: String,
            enum: ["male", "female"],
            required: [true, "Please enter photo"]
        },
        dob: {
            type: Date,
            required: [true, "Please enter your dob"]
        }
    }, 
    {
        timestamps: true,
    }
);

schema.virtual("age").get(function() {
    const today = new Date();
    const dob = this.dob; // here this means the schema itself
    let age = today.getFullYear() - dob.getFullYear();

    if ((today.getMonth() < dob.getMonth()) || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
        /*
        
            If the today month is Feb and dob month is Oct, then ther user has not yet completed his age, so in that case we will decrease the age. 

            For the second condition, if the month is same, then we will compare the dates. For date also the same concept will beused as that for the months.
        
        */

        age--;
    }

    return age;
});
/*

now we have to add an virtual attribute age. So "age" is the name of the virtual attribute and get is a function which takes another function. The use of get() is that, if we want to access something from User, then write User.property_name, so if we want to access age, then we will write User.age and now the get() funtion will help.

But we have a problem, when we are writing User.age, it cannot able to identifiy the attribute. So for that we will use generic.

*/

export const User = mongoose.model<IUser>("User", schema);
