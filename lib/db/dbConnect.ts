import mongoose from "mongoose"

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var db: MongooseCache | undefined // This must be a `var` and not a `let / const`
}

let cached = global.db

if (!cached) {
  global.db = { conn: null, promise: null }
  cached = global.db
}

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  )
}
/**
 * Returns a connection to the MongoDB database.
 *
 * Checks to see if the connection to the MongoDB already exists and returns the connection if so.
 * If not, uses the connection string provided in the environment variable MONGODB_URI
 * to establish a new connection.
 * Logs a success message to the console upon successful connection and an
 * error message upon failure.
 *
 * @async
 * @function
 * @throws {Error} Throws an error if there's an issue connecting to the MongoDB database.
 */
const dbConnect = async () => {
  if (cached.conn) {
    return cached.conn
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mg) => mg)
  }
  try {
    cached.conn = await cached.promise
    console.log("mongoDB connected ...")
  } catch (error) {
    cached.promise = null
    console.log(`Error connecting to MongoDB: ${error}`)
    throw error
  }

  return cached.conn
}

export default dbConnect