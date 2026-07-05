import mongoose from 'mongoose';

/**
 * Execute operations within a transaction if supported by MongoDB.
 * Automatically falls back to standard execution if MongoDB is running
 * in standalone mode (no replica set configured).
 */
export const runInTransaction = async (callback) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    // Check for IllegalOperation code 20 or transaction restriction messages
    const isStandaloneError = 
      error.code === 20 || 
      error.message.includes('Transaction numbers are only allowed') ||
      error.message.includes('replica set');

    if (isStandaloneError) {
      console.warn('MongoDB standalone detected. Falling back to non-transactional database operations.');
      return await callback(null);
    }
    
    throw error;
  } finally {
    session.endSession();
  }
};
