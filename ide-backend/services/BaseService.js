const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class BaseService {
  constructor(model) {
    this.model = model;
  }

  // Create a new document
  async create(data) {
    try {
      const document = new this.model(data);
      await document.save();
      logger.info(`${this.model.modelName} created successfully`, { id: document._id });
      return document;
    } catch (error) {
      logger.error(`Error creating ${this.model.modelName}:`, error);
      if (error.name === 'ValidationError') {
        throw new AppError(`Validation error: ${error.message}`, 400);
      }
      if (error.code === 11000) {
        throw new AppError(`Duplicate ${this.model.modelName} found`, 409);
      }
      throw new AppError(`Failed to create ${this.model.modelName}`, 500);
    }
  }

  // Find document by ID
  async findById(id, populate = null) {
    try {
      let query = this.model.findById(id);
      
      if (populate) {
        if (Array.isArray(populate)) {
          populate.forEach(pop => query = query.populate(pop));
        } else {
          query = query.populate(populate);
        }
      }
      
      const document = await query.exec();
      
      if (!document) {
        throw new AppError(`${this.model.modelName} not found`, 404);
      }
      
      return document;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error finding ${this.model.modelName} by ID:`, error);
      throw new AppError(`Failed to find ${this.model.modelName}`, 500);
    }
  }

  // Find all documents with optional filtering
  async findAll(filter = {}, options = {}) {
    try {
      const {
        populate = null,
        sort = { createdAt: -1 },
        limit = 50,
        skip = 0,
        select = null
      } = options;

      let query = this.model.find(filter);
      
      if (populate) {
        if (Array.isArray(populate)) {
          populate.forEach(pop => query = query.populate(pop));
        } else {
          query = query.populate(populate);
        }
      }
      
      if (select) {
        query = query.select(select);
      }
      
      const documents = await query
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .exec();
      
      return documents;
    } catch (error) {
      logger.error(`Error finding ${this.model.modelName} documents:`, error);
      throw new AppError(`Failed to find ${this.model.modelName} documents`, 500);
    }
  }

  // Find one document with optional filtering
  async findOne(filter, populate = null) {
    try {
      let query = this.model.findOne(filter);
      
      if (populate) {
        if (Array.isArray(populate)) {
          populate.forEach(pop => query = query.populate(pop));
        } else {
          query = query.populate(populate);
        }
      }
      
      const document = await query.exec();
      return document; // Can be null if not found
    } catch (error) {
      logger.error(`Error finding ${this.model.modelName} document:`, error);
      throw new AppError(`Failed to find ${this.model.modelName}`, 500);
    }
  }

  // Update document by ID
  async updateById(id, updateData, options = {}) {
    try {
      const { runValidators = true, new: returnNew = true } = options;
      
      const document = await this.model.findByIdAndUpdate(
        id,
        updateData,
        { 
          new: returnNew, 
          runValidators,
          context: 'query'
        }
      );
      
      if (!document) {
        throw new AppError(`${this.model.modelName} not found`, 404);
      }
      
      logger.info(`${this.model.modelName} updated successfully`, { id });
      return document;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error updating ${this.model.modelName}:`, error);
      if (error.name === 'ValidationError') {
        throw new AppError(`Validation error: ${error.message}`, 400);
      }
      throw new AppError(`Failed to update ${this.model.modelName}`, 500);
    }
  }

  // Delete document by ID
  async deleteById(id) {
    try {
      const document = await this.model.findByIdAndDelete(id);
      
      if (!document) {
        throw new AppError(`${this.model.modelName} not found`, 404);
      }
      
      logger.info(`${this.model.modelName} deleted successfully`, { id });
      return document;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(`Error deleting ${this.model.modelName}:`, error);
      throw new AppError(`Failed to delete ${this.model.modelName}`, 500);
    }
  }

  // Count documents with optional filtering
  async count(filter = {}) {
    try {
      const count = await this.model.countDocuments(filter);
      return count;
    } catch (error) {
      logger.error(`Error counting ${this.model.modelName} documents:`, error);
      throw new AppError(`Failed to count ${this.model.modelName} documents`, 500);
    }
  }

  // Check if document exists
  async exists(filter) {
    try {
      const document = await this.model.findOne(filter).select('_id').lean();
      return !!document;
    } catch (error) {
      logger.error(`Error checking ${this.model.modelName} existence:`, error);
      throw new AppError(`Failed to check ${this.model.modelName} existence`, 500);
    }
  }

  // Paginated find
  async findPaginated(filter = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        populate = null,
        select = null
      } = options;

      const skip = (page - 1) * limit;
      
      let query = this.model.find(filter);
      
      if (populate) {
        if (Array.isArray(populate)) {
          populate.forEach(pop => query = query.populate(pop));
        } else {
          query = query.populate(populate);
        }
      }
      
      if (select) {
        query = query.select(select);
      }
      
      const [documents, total] = await Promise.all([
        query.sort(sort).limit(limit).skip(skip).exec(),
        this.model.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;
      
      return {
        documents,
        pagination: {
          currentPage: page,
          totalPages,
          totalDocuments: total,
          hasNextPage,
          hasPrevPage,
          limit
        }
      };
    } catch (error) {
      logger.error(`Error in paginated find for ${this.model.modelName}:`, error);
      throw new AppError(`Failed to find ${this.model.modelName} documents`, 500);
    }
  }

  // Bulk operations
  async bulkCreate(dataArray) {
    try {
      const documents = await this.model.insertMany(dataArray, { ordered: false });
      logger.info(`Bulk created ${documents.length} ${this.model.modelName} documents`);
      return documents;
    } catch (error) {
      logger.error(`Error in bulk create for ${this.model.modelName}:`, error);
      throw new AppError(`Failed to bulk create ${this.model.modelName} documents`, 500);
    }
  }

  async bulkUpdate(filter, updateData) {
    try {
      const result = await this.model.updateMany(filter, updateData);
      logger.info(`Bulk updated ${result.modifiedCount} ${this.model.modelName} documents`);
      return result;
    } catch (error) {
      logger.error(`Error in bulk update for ${this.model.modelName}:`, error);
      throw new AppError(`Failed to bulk update ${this.model.modelName} documents`, 500);
    }
  }

  async bulkDelete(filter) {
    try {
      const result = await this.model.deleteMany(filter);
      logger.info(`Bulk deleted ${result.deletedCount} ${this.model.modelName} documents`);
      return result;
    } catch (error) {
      logger.error(`Error in bulk delete for ${this.model.modelName}:`, error);
      throw new AppError(`Failed to bulk delete ${this.model.modelName} documents`, 500);
    }
  }
}

module.exports = BaseService;