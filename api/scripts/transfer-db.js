const { exec } = require("child_process")
const fs = require("fs")
console.log("📤 Transferring database to EC2...")

// Read EC2 IP from environment or config
const EC2_IP =
  process.env.EC2_IP || "ec2-18-220-89-123.us-east-2.compute.amazonaws.com"
const KEY_FILE = process.env.EC2_KEY || "philadelphia-duc-mbp.pem"

// Check if backup file exists
if (!fs.existsSync("./database-backup.sql")) {
  console.error(
    "❌ database-backup.sql not found. Run npm run migrate:export first."
  )
  process.exit(1)
}

// Transfer file to EC2
const command = `scp -i ~/.ssh/${KEY_FILE} -o StrictHostKeyChecking=no database-backup.sql ubuntu@${EC2_IP}:/home/ubuntu/app/api/database-backup.sql`

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Transfer failed: ${error}`)
    return
  }
  console.log("✅ Database backup transferred to EC2")

  // Clean up local backup
  fs.unlinkSync("./database-backup.sql")
  console.log("🧹 Local backup cleaned up")
})
