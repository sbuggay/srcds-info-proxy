"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upToDate = void 0;
function upToDate(appid, version) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `http://api.steampowered.com/ISteamApps/UpToDateCheck/v0001/?appid=${appid}&version=${version}&format=json`;
        return yield fetch(url);
    });
}
exports.upToDate = upToDate;
//# sourceMappingURL=version.js.map