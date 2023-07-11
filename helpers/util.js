module.exports = {

    isLoggedIn: function (req, res, next) {
        if (req.session.user) {
            next();
        } else {
            res.redirect('/');
        }
    },

    isAdmin: (req, res, next) => {
        if (req.session.user && req.session.user.role === 'admin') {
            // User is an admin, allow access to the dashboard
            next();
        } else {
            // User is not an admin, redirect to a different page or show an error
            res.status(403).json({ error: 'Unauthorized access' });
        }
    }

}