const mongoose = require("mongoose")

const saleSchema = new mongoose.Schema({

product_id:{
type:mongoose.Schema.Types.ObjectId,
ref:"Product",
required:true
},

product_name:{
type:String,
required:true
},

quantity_sold:{
type:Number,
required:true
},

revenue:{
type:Number,
required:true
}

},{
timestamps:true
})

module.exports = mongoose.model("Sale",saleSchema)