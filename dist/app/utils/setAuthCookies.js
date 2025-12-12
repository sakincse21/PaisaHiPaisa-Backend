"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAuthCookie = void 0;
const setAuthCookie = (res, token) => {
    res.cookie("accessToken", token, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7, // Expires in 7 days
    });
    // res.cookie("accessToken", token, {
    //     httpOnly: true, // Accessible only by the server
    //     secure: true, // Sent only over HTTPS
    //     sameSite: "none",
    //     domain: "localhost", // Adjust domain as needed
    // });
    // if (tokenInfo.refreshToken) {
    //     res.cookie("refreshToken", tokenInfo.refreshToken, {
    //         httpOnly: true,
    //         secure: envVars.NODE_ENV === "production",
    //         sameSite: "none"
    //     })
    // }
};
exports.setAuthCookie = setAuthCookie;
