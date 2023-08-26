const db=require('../models/database')
const User=db.users
const Book=db.books
const { Op } = require('sequelize');
// const Book = require('../models/Book');
// const User = require('../models/User');
const Order = require('../models/Order');
const e = require('express');
exports.getAllBooks = async (req, res) => {
  const page = req.query.page || 1; // Get the requested page from query parameters
  try {
    const { rows: books } = await Book.findAndCountAll({
      where: {
        transaction: false, // Exclude books with transaction = true
      },
      include: {
        model: User,
        as: 'User',
        attributes: ['username'],
      },
      attributes: ['book_id', 'title', 'author', 'genre', 'book_condition', 'is_for_sale', 'is_for_giveaway', 'is_for_loan', 'price', 'book_img_url'], // Add more attributes as needed
    });

    res.json({ books});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.searchBooks = async (req, res) => {
  try {
    const { searchQuery } = req.query;
    console.log(searchQuery);

    const query = {
      where: {
        title: { [Op.like]: `%${searchQuery}%` },
        transaction: false,
      },
    };

    const books = await Book.findAll(query);

    return res.status(200).json(books);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// const Book = require('../models/Book'); // Import the Book model
exports.filterBooks = async (req, res) => {
  try {
    console.log("Filtering")
    const filters = req.query;
    const whereClause = {};
    const orderClause = [];
    console.log(filters)

    if (filters.genre) {
      whereClause.genre = filters.genre;
    }
    whereClause.transaction=false
    if (filters.book_type) {
      if (filters.book_type === "Giveaway") {
        whereClause.is_for_giveaway = true;
      } else if (filters.book_type === "Loan") {
        whereClause.is_for_loan = true;
      } else if (filters.book_type === "Price High to Low") {
        orderClause.push(["price", "ASC"]);
      }
    }

    if (filters.sort === "A to Z") {
      orderClause.push(["title", "ASC"]);
    } else if (filters.sort === "Z to A") {
      orderClause.push(["title", "DESC"]);
    }

    const filteredBooks = await Book.findAll({
      where: whereClause,
      order: orderClause,
    });
    console.log(filteredBooks)
    res.json(filteredBooks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error filtering books" });
  }
};


exports.getOrderableBooks = async (req, res) => {
  try {
    const books = await Book.findAll({
      where: {
        [req.query.filter]: true,
      },
      include: [{ model: User, as: 'User', attributes: ['username'] }],
    });

    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};




exports.addBook = async (req, res) => {
  try {
    console.log("Inside add")
    const user_id = req.user.user_id; // Assuming you have user authentication implemented

    const {
      title,
      author,
      genre,
      description,
      book_img_url,
      book_condition,
      book_type,
      price,
    } = req.body;
    console.log(req.body)
    // if (!title || !author || !description || !book_condition) {
    //   return res.status(400).json({ message: 'Please fill out all required fields.' });
    // }
    let is_for_sale = false;
    let is_for_loan = false;
    let is_for_giveaway = false;

    if (book_type === "Sale") {
      is_for_sale = true;
    } else if (book_type === "Loan") {
      is_for_loan = true;
    } else {
      is_for_giveaway = true;
    }

    // Handle setting price to null if it's not provided
    let finalPrice = null;
    if (price !== undefined && price !== null && price !== '') {
      finalPrice = price;
    }
    // let book_img_url
    // if(req.file)
    // {
    //   book_img_url=req.file.path
    //   console.log(req.file.path)
    // }
    let transaction=false
    const book = await Book.create({
      title,
      author,
      description,
      book_condition,
      price: finalPrice,
      user_id: user_id,
      is_for_sale,
      is_for_loan,
      is_for_giveaway,
      genre,
      book_img_url,
      transaction,
    });

    return res.status(201).json({ message: 'Book added successfully' });
  } catch (error) {
    console.error(error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Validation error. Please check your inputs.' });
    }

    return res.status(500).json({ message: 'Server error' });
  }
};


exports.deleteBook = async (req, res) => {
  const { id } = req.params; // Get the book ID from URL parameters

  try {
    // Find the book by ID
    const book = await Book.findByPk(id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Delete the book from the database
    await book.destroy();

    res.json({ message: 'Book deleted successfully' }); // Send the success message as the response
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBook = async (req, res) => {
  const { id } = req.params; // Get the book ID from URL parameters

  try {
    // Find the book by ID
    const book = await Book.findByPk(id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Update the book attributes based on the request body
    book.title = req.body.title || book.title;
    book.author = req.body.author || book.author;
    // ... update other attributes as needed ...

    // Save the updated book in the database
    await book.save();

    res.json(book); // Send the updated book data as the response
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getBookById = async (req, res) => {
  const { book_id } = req.params; // Get the book_id from URL parameters
  console.log(book_id)
  console.log("Finding the book")
  try {
    const book = await Book.findOne({
      where: { book_id },
      // include: { model: User, as: 'User', attributes: ['username'] },
    });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    console.log(book) 
    res.json(book);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBooksById = async (req, res) => {
  const { user_id } = req.params; // Get the user_id from URL parameters

  try {
    const books = await Book.findAll({
      where: { user_id }, // Filter by user_id
      include: { model: User, as: 'User', attributes: ['username'] },
    });

    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserById = async (req, res) => {
  const { book_id } = req.params;
  console.log("Finding Uploader")
  try {
    const book = await Book.findOne({ where: { book_id } });

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const user = await User.findByPk(book.user_id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log(user)
    // Return the user's profile information
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


