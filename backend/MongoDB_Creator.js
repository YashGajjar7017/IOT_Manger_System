const { MongoClient } = require('mongodb');

async function initializeDatabase() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        
        // Check if database already exists
        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();
        const dbExists = dbs.databases.some(d => d.name === "IOT_Monitor_System");

        if (!dbExists) {
            console.log("Database 'IOT_Monitor_System' not found. Creating database and initializing collections...");
        } else {
            console.log("Database 'IOT_Monitor_System' already found. Verifying collections...");
        }

        // 1. Target your specific database
        const db = client.db("IOT_Monitor_System");

        // 2. Define the exact names of your collections
        const collectionsToCreate = [
            "Device_Name",
            "Troubleshoot_Logs",
            "adminusers",
            "certificatelogs",
            "telemetries"
        ];

        // 3. Get currently existing collections
        const existingCollections = await db.listCollections().toArray();
        const existingNames = existingCollections.map(col => col.name);

        // 4. Create them only if they don't exist yet
        for (const name of collectionsToCreate) {
            if (!existingNames.includes(name)) {
                await db.createCollection(name);
                console.log(`Successfully created empty collection: ${name}`);
            }
        }
    } catch (error) {
        console.error("Database initialization failed:", error);
    } finally {
        await client.close();
    }
}

// Run this when your app starts up
initializeDatabase();