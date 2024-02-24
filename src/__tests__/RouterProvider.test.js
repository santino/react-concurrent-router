/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom/jest-globals'
import React from 'react'
import { render } from '@testing-library/react'

import RouterContext from '../RouterContext'
import RouterProvider from '../RouterProvider'

describe('RouterProvider', () => {
  it('provides correctly a ContextProvider', () => {
    const tree = render(
      <RouterProvider router='curstomRouterContext'>
        <RouterContext.Consumer>
          {value => <span>context value: {value}</span>}
        </RouterContext.Consumer>
      </RouterProvider>
    ).getByText(/^context value:/)

    expect(tree).toHaveTextContent('context value: curstomRouterContext')
  })
})
