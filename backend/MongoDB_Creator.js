const { MongoClient } = require('mongodb');

async function initializeDatabase(customUri) {
    const uri = customUri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });

    const result = {
        success: false,
        dbExists: false,
        createdCollections: [],
        verifiedCollections: [],
        message: ''
    };

    try {
        await client.connect();
        
        // Check if database already exists
        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();
        result.dbExists = dbs.databases.some(d => d.name === "IOT_Monitor_System");

        if (!result.dbExists) {
            console.log("[DATABASE INIT] Database 'IOT_Monitor_System' not found. Creating database and initializing collections...");
        } else {
            console.log("[DATABASE INIT] Database 'IOT_Monitor_System' found. Verifying collections...");
        }

        // 1. Target database
        const db = client.db("IOT_Monitor_System");

        // 2. Collections schema list
        const collectionsToCreate = [
            "Device_Name",
            "Troubleshoot_Logs",
            "adminusers",
            "certificatelogs",
            "telemetries"
        ];

        // 3. Get existing collections
        const existingCollections = await db.listCollections().toArray();
        const existingNames = existingCollections.map(col => col.name);

        // 4. Create missing collections
        for (const name of collectionsToCreate) {
            if (!existingNames.includes(name)) {
                await db.createCollection(name);
                result.createdCollections.push(name);
                console.log(`[DATABASE INIT] Successfully created empty collection: ${name}`);
            } else {
                result.verifiedCollections.push(name);
            }
        }

        result.success = true;
        if (result.dbExists) {
            result.message = `Database 'IOT_Monitor_System' found! Verified ${result.verifiedCollections.length} collection(s)${result.createdCollections.length > 0 ? ` and created ${result.createdCollections.length} new collection(s): ${result.createdCollections.join(', ')}` : '.'}`;
        } else {
            result.message = `Database 'IOT_Monitor_System' created successfully with ${result.createdCollections.length} initial collection(s): ${result.createdCollections.join(', ')}.`;
        }

        console.log(`[DATABASE INIT ACKNOWLEDGEMENT] ${result.message}`);
        return result;
    } catch (error) {
        console.error("[DATABASE INIT ERROR] Database initialization failed:", error.message);
        result.success = false;
        result.message = `Database initialization failed: ${error.message}`;
        return result;
    } finally {
        try {
            await client.close();
        } catch (e) {}
    }
}

// Auto-run if executed directly or required
initializeDatabase().catch(err => console.warn('[DATABASE INIT RUN WARN]', err.message));

module.exports = {
    initializeDatabase
};