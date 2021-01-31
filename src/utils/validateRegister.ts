import UsernamePasswordInput from 'src/resolvers/UsernamePasswordInput';

export default (options: UsernamePasswordInput) => {
  if (!options.email.includes('@')) {
    return [
      {
        field: 'email',
        message: 'invalid e-mail',
      },
    ];
  }

  if (options.username.length < 2) {
    return [
      {
        field: 'username',
        message: 'username is too short',
      },
    ];
  }

  if (options.username.includes('@')) {
    return [
      {
        field: 'username',
        message: 'username can not include @ symbol',
      },
    ];
  }

  if (options.password.length < 3) {
    return [
      {
        field: 'password',
        message: 'password is too short',
      },
    ];
  }

  return null;
};
