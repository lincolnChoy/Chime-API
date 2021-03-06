const handleRegister = (req, res, db, bcrypt) => {


	/* Destructure request body */
	const { email, first, last, pw } = req.body;

	if (!email || !first || !last || !pw) {

		return res.status(400).json({ code : 3 });
	}

	db.select('email').from('usersct')
	.where('email','=', email)
	.then(data => {
		
		/* If the email already exists, send error code back to front-end */
		if (data != "") {
			if (data[0].email) {
				return res.send({ code : 6 });
			}
		}
		else {
			/* Synchronous hashing */
			const hash = bcrypt.hashSync(pw);

			/* Transaction for consistency */
			db.transaction(trx => {

				const lastSeen = ((new Date).getTime()).toString();
				
				/* First insert into login table */
				trx.insert({
					hash : hash,
					email : email,
					lastseen : lastSeen
				})
				.into('loginct')
				.returning('id')
				.then(id => {
					return trx('profilect')
					.returning('*')
					.insert({
						id : id[0],
						picture: 'https://i.imgur.com/FSgbIi4.png'
					})
					.then(user => {
						return trx('usersct')
						.returning('*')
						.insert({
							email : email,
							first : first,
							last : last
						})
						/* On successful API call, return the user object to the front-end */
						.then(user => {
							return res.status(200).json({ code : 0, 
															user: {
																first : user[0].first, 
																last : user[0].last, 
																id : user[0].id, 
																picture : 'https://i.imgur.com/FSgbIi4.png'
															} 
							});
						});
					})
				})
				/* Commit changes */
				.then(trx.commit)
				/* Delete transaction if failed anywhere */
				.catch(trx.rollback)
			})
			/* Return db error code if failed */
			.catch(err => res.json({ code : 5 }));	
		}
	});
}


module.exports = {
	handleRegister : handleRegister
}