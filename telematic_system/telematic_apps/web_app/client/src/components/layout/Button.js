/*
 * Copyright (C) 2026 LEIDOS.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import { Button as MuiButton } from '@mui/material';

/**
 * Reusable Button component wrapping Material-UI Button
 * Provides consistent styling across the application
 */
const Button = ({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  onClick,
  type = 'button',
  sx,
  ...props
}) => {
  const buttonSx = {
    ...(variant === 'contained' && color === 'primary' && {
      backgroundColor: '#748c93',
      '&:hover': {
        backgroundColor: '#5f7379',
      },
    }),
    ...(variant === 'outlined' && color === 'primary' && {
      borderColor: '#748c93',
      color: '#748c93',
      '&:hover': {
        borderColor: '#5f7379',
        backgroundColor: 'rgba(116, 140, 147, 0.04)',
      },
    }),
    ...sx,
  };

  return (
    <MuiButton
      variant={variant}
      color={color}
      size={size}
      disabled={disabled}
      fullWidth={fullWidth}
      startIcon={startIcon}
      endIcon={endIcon}
      onClick={onClick}
      type={type}
      sx={buttonSx}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button;
