/*

The in-built error class has only 3 things, message, stack and name. But we want that status code should also be there. So we will make our own error class in utils folder.

*/
class ErrorHandler extends Error {
    constructor(public message: string, public statusCode: number) {
        super(message); // calling the constructor of the parent class i.e Error
        this.statusCode = statusCode;
    }
}

export default ErrorHandler;