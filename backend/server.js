require('dotenv').config();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in the backend environment before starting the server.');
}

const app = require('./src/app');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`ULITMS server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
