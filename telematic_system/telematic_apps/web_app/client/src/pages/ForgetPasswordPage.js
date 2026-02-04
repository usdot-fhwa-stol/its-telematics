import { yupResolver } from '@hookform/resolvers/yup';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import PasswordIcon from '@mui/icons-material/Password';
import { Alert, Avatar, Box, Button, Container, FormControl, Grid, Snackbar, TextField } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { Capacitor } from '@capacitor/core';
import { updatePassword } from '../api/api-user';
import { SEVERITY } from '../components/users/UserMetadata';
import { getMobileWrapperStyles, getMobileContainerStyles, getMobileBoxStyles, getTextFieldStyles } from '../utils/mobileStyles';

const ForgetPasswordPage = React.memo(() => {
  const [open, setOpen] = useState(false);
  const [confirmNewPwd, setconfirmNewPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [errStatus, setErrorStatus] = useState('info');
  const [errorMsg, setErrorMsg] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isMobile] = useState(Capacitor.isNativePlatform());
  const theme = createTheme();
  const handleClose = () => {
    setErrorMsg('')
    setOpen(false);
  }
  const handleName = (event) => {
    setUsername(event.target.value);
  }

  const handleEmail = (event) => {
    setEmail(event.target.value);
  }

  const handleConfirmPassword = (event) => {
    setconfirmNewPwd(event.target.value);
  }
  const handleNewPassword = (event) => {
    setNewPwd(event.target.value);
  }

  const changePassword = (event) => {
    //Current password and confirm password shall match
    if (newPwd !== "" && confirmNewPwd !== "" && newPwd !== confirmNewPwd) {
      setErrorMsg('Passwords do not match.')
      setErrorStatus(SEVERITY.ERROR);
      setOpen(true);
      return;
    }

    const response = updatePassword(username, email, newPwd);
    response.then(status => {
      if (status.errCode !== undefined && status.errMsg !== undefined) {
        setErrorMsg(status.errMsg);
        setOpen(true);
        setErrorStatus(SEVERITY.ERROR);
      } else {
        //successfully change password, and reset the form
        resetForgetPwdForm();
        setErrorMsg(status.message);
        setOpen(true);
        setErrorStatus(SEVERITY.SUCCESS);
      }
    }).catch(error => {
      console.error(error);
      setErrorMsg(error);
      setOpen(true);
      setErrorStatus(SEVERITY.ERROR);
    })

  }

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    email: Yup.string().required('Email is required'),
    confirm_new_password: Yup.string().required('Confirm password is required'),
    new_password: Yup.string().required('New password is required'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    clearErrors,
    resetField
  } = useForm({
    resolver: yupResolver(validationSchema)
  });

  const resetForgetPwdForm = () => {
    setconfirmNewPwd('');
    setNewPwd('');
    setUsername('');
    setEmail('');
    clearErrors();
    resetField("name");
    resetField("email");
    resetField("current_password");
    resetField("confirm_new_password");
    resetField("new_password");
  }

  return (
    <React.Fragment>
      <ThemeProvider theme={theme}>
        <Snackbar
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          open={open}
          autoHideDuration={6000}
          key="Login">
          <Alert onClose={handleClose} severity={errStatus} sx={{ width: '100%' }}>
            {errorMsg}
          </Alert>
        </Snackbar>
        <Box sx={getMobileWrapperStyles(isMobile)}>
          <Container 
            component="main" 
            maxWidth="xs"
            sx={getMobileContainerStyles(isMobile)}
          >
            <Box
              sx={getMobileBoxStyles(isMobile, 12)}
            >
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <PasswordIcon />
            </Avatar>
            <Box component="form" sx={{ mt: 1, width: '100%' }}>
              <FormControl fullWidth>
                <TextField id="name"
                  label="User Name *"
                  variant='outlined'
                  inputProps={{'data-testid':'username'}}
                  fullWidth
                  {...register('name')}
                  error={errors.name ? true : false}
                  margin="normal"
                  value={username}
                  onChange={handleName}
                  sx={getTextFieldStyles(isMobile)} />
              </FormControl>

              <FormControl fullWidth>
                <TextField id="email"
                  label="Email *"
                  variant='outlined'
                  fullWidth
                  margin="normal"
                  inputProps={{'data-testid':'email'}}
                  {...register('email')}
                  value={email}
                  error={errors.email ? true : false}
                  onChange={handleEmail}
                  sx={getTextFieldStyles(isMobile)} />
              </FormControl>

              <FormControl fullWidth>
                <TextField
                  id="new_password"
                  label="New Password *"
                  name="new_password"
                  type="password"
                  inputProps={{'data-testid':'password'}}
                  fullWidth
                  value={newPwd}
                  margin="normal"
                  variant='outlined'
                  {...register('new_password')}
                  error={errors.new_password ? true : false}
                  onChange={handleNewPassword}
                  sx={getTextFieldStyles(isMobile)} />
              </FormControl>

              <FormControl fullWidth>
                <TextField
                  id="confirm_new_password"
                  label="Confirm New Password *"
                  fullWidth
                  margin="normal"
                  name="confirm_new_password"
                  inputProps={{'data-testid':'new_password'}}
                  type="password"
                  {...register('confirm_new_password')}
                  error={errors.confirm_new_password ? true : false}
                  variant='outlined'
                  value={confirmNewPwd}
                  onChange={handleConfirmPassword}
                  sx={getTextFieldStyles(isMobile)} />
              </FormControl>
              <Box sx={{ width: '100%' }}>
                <Grid container spacing={isMobile ? 0 : 0}>
                  <Grid item xs={6}>
                    <Button 
                      sx={{ float: 'left', fontSize: isMobile ? '0.75rem' : 'inherit' }} 
                      href="/telematic/login" 
                      variant='outlined'
                      size={isMobile ? 'small' : 'medium'}
                    >
                      <KeyboardDoubleArrowLeftIcon fontSize="small"/>
                      {isMobile ? 'Back' : 'Back To Login'}
                    </Button>
                  </Grid>
                  <Grid item xs={6} >
                    <Button
                      sx={{ float: 'right', fontSize: isMobile ? '0.75rem' : 'inherit' }}
                      variant='contained'
                      margin="normal"
                      size={isMobile ? 'small' : 'medium'}
                      onClick={handleSubmit(changePassword)}>
                      Reset {isMobile ? 'Pwd' : 'Password'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Box>
        </Container>
        </Box>
      </ThemeProvider>
    </React.Fragment >
  )
});

export default ForgetPasswordPage