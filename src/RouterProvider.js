import React from 'react'
import RouterContext from './RouterContext'

/**
 * Provider that allows descendants components to consume Context value
 */
const RouterProvider = ({ children, router }) => (
  <RouterContext.Provider value={router} children={children} />
)

export default RouterProvider
