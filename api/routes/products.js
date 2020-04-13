const express = require('express');
const router = express.Router();
const Product = require('../models/products');
const mongoose = require('mongoose');
const multer = require('multer');
const checkAuth = require('../middleware/check-auth');

//implementing a storage strategy
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, new Date().toISOString() + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    //reject a file
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 //for files up to 5MB
    },
    fileFilter: fileFilter
    // dest: 'uploads/' //store all files in this destination(route)
});

//GET route that returns all the products available
//like a list view
router.get('/', (req, res, next) => {
    Product.find()
    .select('name price _id productImage') //returns the specified keys from the object
    .exec()
    .then(docs => {
        const response = {
            count: docs.length,
            products: docs.map(doc => {
                return {
                    name: doc.name,
                    price: doc.price,
                    productImage: doc.productImage,
                    _id: doc._id,
                    request: {
                        type: 'GET',
                        url: 'http://localhost:4000/products/' + doc._id
                    }
                }
            })
        }
        // console.log(docs);
        res.status(200).json(response);
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        })
    });
});

//POST request to allow users add products to the array
router.post('/', checkAuth, upload.single('productImage'), (req, res, next) => {
    console.log(req.file);
    //creates the new product based on the schema in the database
    const product = new Product({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        price: req.body.price,
        productImage: req.file.path
    });

    product.save() //saves the input from the POST request to the DB
    .then(result => {
        console.log(result);
        res.status(201).json({
            message: 'Created product successfully',
            createdProduct: {
                name: result.name,
                price: result.price,
                _id: result._id,
                request: {
                    type: 'POST',
                    url: "http://localhost:4000/" + result._id
                }
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });

    
});

//GET request to display one product at a time by it's id
//like a detail view
router.get('/:productId', (req, res, next) => {
    const id = req.params.productId;
    Product.findById(id) //finds a product from the list of products
    .select('name price _id productImage')
    .exec()
    .then(doc => {
        console.log("From DB",doc);
        if(doc) {
            res.status(200).json(doc);
        } else {
            res.status(404).json({
                message: 'No valid entry found for provided ID'
            });
        }
        
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
});

//PATCH request, to edit/update a POST request
router.patch('/:productId', checkAuth, (req, res, next) => {
    const id = req.params.productId; //to get the id of product to be updated
    const updateOps = {}; //empty object to allow for specifying of fields to be updated in the object, instead of updating the whole object everytime

    //loops through the request and updates the object using 'updateOps'
    for (const ops of req.body) {
        updateOps[ops.propName] = ops.value;
    }
    //mongoose update method that updates the data by using it's 
    //id and uses the data from 'updateOps' to $set to replace the value in a field
    Product.update({_id: id}, {$set: updateOps}).exec()
    .then(result => {
        // console.log(result);
        res.status(200).json({
            message: 'Product updated',
            request: {
                type: 'GET',
                url: 'http://localhost:4000/products/' + id
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
});

//DELETE request that removes an item from the object by it's id to ensure it removes a specific item
router.delete('/:productId', checkAuth, (req, res, next) => {
    const id = req.params.productId;
    Product.remove({_id: id}).exec()
    .then(result => {
        res.status(200).json({
            message: "Product deleted",
            //tells user other actions he can perform and through what route and the schema of how data should be arranged
            request: {
                type: 'POST',
                url: 'http://localhost:4000/products',
                data: {
                    name: 'String', price: 'Number'
                }
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
});


module.exports = router;
