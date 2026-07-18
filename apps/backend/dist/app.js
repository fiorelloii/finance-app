"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("./server"));
const start = async () => {
    const port = Number(process.env.PORT || 3000);
    try {
        await server_1.default.listen({ host: '0.0.0.0', port });
        console.log(`Backend running on port ${port}`);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
};
start();
