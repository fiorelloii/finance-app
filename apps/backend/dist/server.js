"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const controller_1 = require("./modules/transactions/controller");
const app = (0, fastify_1.default)({ logger: true });
app.register(cors_1.default, { origin: '*' });
app.register(multipart_1.default);
app.register(controller_1.transactionsRoutes);
exports.default = app;
