const Post = require('../models/Post');
const User = require('../models/User');
const { Op } = require('sequelize');

const createPost = async (req, res) => {
  try {
    const { title, content, excerpt, status } = req.body;
    const authorId = req.user.id;

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-');

    const postData = {
      title,
      content,
      excerpt,
      slug,
      authorId,
      status: status || 'draft'
    };

    if (status === 'published') {
      postData.publishedAt = new Date();
    }

    const post = await Post.create(postData);
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = { status: 'published' };

    if (req.query.category) {
      whereClause.category = req.query.category;
    }

    if (req.query.search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${req.query.search}%` } },
        { content: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    const { count, rows } = await Post.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email']
      }],
      order: [['publishedAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      posts: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

const getPostBySlug = async (req, res) => {
  try {
    const post = await Post.findOne({
      where: { 
        slug: req.params.slug,
        status: 'published'
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user is author or admin
    if (post.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, content, excerpt, status } = req.body;
    
    if (title) {
      post.title = title;
      post.slug = title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
    }
    
    if (content) post.content = content;
    if (excerpt) post.excerpt = excerpt;
    
    if (status === 'published' && post.status !== 'published') {
      post.publishedAt = new Date();
    }
    
    post.status = status || post.status;

    await post.save();
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user is author or admin
    if (post.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await post.destroy();
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostBySlug,
  updatePost,
  deletePost
};