import '@testing-library/jest-dom/extend-expect'
import React from 'react'
import { render, fireEvent } from '@testing-library/react'

import createMemoryRouter from '../createMemoryRouter'
import RouterContext from '../RouterContext'
import Link from '../Link'

const router = createMemoryRouter({
  routes: [
    {
      path: '/',
      component: () => Promise.resolve(true),
      children: [
        {
          path: 'test',
          component: () => Promise.resolve(true)
        },
        { path: '*', component: () => Promise.resolve(true) }
      ]
    }
  ]
})

jest.spyOn(router, 'isActive')
jest.spyOn(router, 'preloadCode')
jest.spyOn(router, 'warmRoute')
jest.spyOn(router.history, 'replace')
jest.spyOn(router.history, 'push')

const wrap = (props = {}) =>
  render(
    <RouterContext.Provider value={router}>
      <Link to='/test' {...props}>
        test
      </Link>
    </RouterContext.Provider>
  )

describe('Link', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders a link with expected href and content attribute', () => {
      const link = wrap().getByRole('link')

      expect(link).toHaveTextContent('test')
      expect(link).toHaveAttribute('href', '/test')
      expect(link).not.toHaveClass()
    })

    it('correctly forwards ref', () => {
      const ref = React.createRef()
      wrap({ ref })

      expect(ref.current).toHaveTextContent('test')
      expect(ref.current).toHaveAttribute('href', '/test')
    })

    it('adds attributes to link according to props passed', () => {
      const link = wrap({
        className: 'link-style',
        target: '_self',
        'aria-label': 'test link',
        title: 'my-link'
      }).getByRole('link')

      expect(link).toHaveClass('link-style')
      expect(link).toHaveAttribute('target', '_self')
      expect(link).toHaveAttribute('aria-label', 'test link')
      expect(link).toHaveAttribute('title', 'my-link')
    })

    it('behaves as expected on non-active link', () => {
      router.isActive.mockReturnValueOnce(false)
      const link = wrap().getByRole('link')

      expect(router.isActive).toHaveBeenCalledTimes(1)
      expect(router.isActive).toHaveBeenCalledWith('/test', false)

      expect(link).not.toHaveClass()
      expect(link).not.toHaveAttribute('aria-current')
    })

    it('behaves as expected on active link', () => {
      router.isActive.mockReturnValueOnce(true)
      const link = wrap().getByRole('link')

      expect(router.isActive).toHaveBeenCalledTimes(1)
      expect(router.isActive).toHaveBeenCalledWith('/test', false)

      expect(link).toHaveClass('active')
      expect(link).toHaveAttribute('aria-current', 'page')
    })

    it('combines className with active className on active link', () => {
      router.isActive.mockReturnValueOnce(true)
      const link = wrap({ className: 'link-style' }).getByRole('link')
      expect(link).toHaveClass('link-style active')
    })

    it('attaches custom active className on active link', () => {
      router.isActive.mockReturnValueOnce(true)
      const link = wrap({ activeClassName: 'active-nav-link' }).getByRole(
        'link'
      )
      expect(link).toHaveClass('active-nav-link')
    })
  })

  describe('handleClick', () => {
    it('triggers router history.push and custom onClick function when passed in', () => {
      const mockOnClick = jest.fn()
      const link = wrap({ onClick: mockOnClick }).getByRole('link')

      expect(mockOnClick).not.toHaveBeenCalled()
      fireEvent.click(link)
      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(mockOnClick).toHaveBeenCalledWith(expect.any(Object))

      expect(router.history.replace).not.toHaveBeenCalled()
      expect(router.history.push).toHaveBeenCalledTimes(1)
      expect(router.history.push).toHaveBeenCalledWith('/test')
    })

    it('does not trigger router history when custom onClick prevents default', () => {
      const mockOnClick = jest
        .fn()
        .mockImplementation(event => event.preventDefault())
      const link = wrap({ onClick: mockOnClick }).getByRole('link')

      fireEvent.click(link)
      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(router.history.push).not.toHaveBeenCalled()
      expect(router.history.replace).not.toHaveBeenCalled()
    })

    it('does not trigger router history when right-clicking', () => {
      fireEvent.click(wrap().getByRole('link'), { button: 2 })
      expect(router.history.push).not.toHaveBeenCalled()
    })

    it('triggers router history when target is _self', () => {
      const event = fireEvent.click(wrap().getByRole('link'), {
        target: { target: '_self' }
      })
      expect(router.history.push).toHaveBeenCalledTimes(1)
      expect(event).toBe(false) // defaultPrevented
    })

    it('does not trigger router history when target is not _self', () => {
      const link = wrap().getByRole('link')
      const blankEvent = fireEvent.click(link, { target: { target: '_blank' } })
      const parentEvent = fireEvent.click(link, {
        target: { target: '_parent' }
      })
      const topEvent = fireEvent.click(link, { target: { target: '_top' } })

      expect(router.history.push).not.toHaveBeenCalled()
      expect(router.history.replace).not.toHaveBeenCalled()
      expect(blankEvent).toBe(true) // not defaultPrevented
      expect(parentEvent).toBe(true) // not defaultPrevented
      expect(topEvent).toBe(true) // not defaultPrevented
    })

    it('does not trigger router history on event with meta/alt/ctrl/shift keys', () => {
      const link = wrap().getByRole('link')
      const metaEvent = fireEvent.click(link, { metaKey: true })
      const altEvent = fireEvent.click(link, { altKey: true })
      const ctrlEvent = fireEvent.click(link, { ctrlKey: true })
      const shiftEvent = fireEvent.click(link, { shiftKey: true })

      expect(router.history.push).not.toHaveBeenCalled()
      expect(router.history.replace).not.toHaveBeenCalled()
      expect(metaEvent).toBe(true) // not defaultPrevented
      expect(altEvent).toBe(true) // not defaultPrevented
      expect(ctrlEvent).toBe(true) // not defaultPrevented
      expect(shiftEvent).toBe(true) // not defaultPrevented
    })

    it('triggers history/replace when link is active', () => {
      router.isActive.mockReturnValueOnce(true).mockReturnValueOnce(true)
      const event = fireEvent.click(wrap().getByRole('link'))

      expect(event).toBe(false) // defaultPrevented
      expect(router.history.push).not.toHaveBeenCalled()
      expect(router.history.replace).toHaveBeenCalledTimes(1)
      expect(router.history.replace).toHaveBeenCalledWith('/test')
    })
  })

  describe('handlePreloadCode', () => {
    it('triggers router preloadCode on mouseOver event', () => {
      expect(router.preloadCode).not.toHaveBeenCalled()
      fireEvent.mouseOver(wrap().getByRole('link'))
      expect(router.preloadCode).toHaveBeenCalledTimes(1)
      expect(router.preloadCode).toHaveBeenCalledWith('/test')
    })

    it('triggers router preloadCode on focus event', () => {
      expect(router.preloadCode).not.toHaveBeenCalled()
      fireEvent.focus(wrap().getByRole('link'))
      expect(router.preloadCode).toHaveBeenCalledTimes(1)
      expect(router.preloadCode).toHaveBeenCalledWith('/test')
    })
  })

  describe('handleWarmRoute', () => {
    it('triggers router warmRoute on mouseDown event', () => {
      expect(router.warmRoute).not.toHaveBeenCalled()
      fireEvent.mouseDown(wrap().getByRole('link'))
      expect(router.warmRoute).toHaveBeenCalledTimes(1)
      expect(router.warmRoute).toHaveBeenCalledWith('/test')
    })

    it('triggers router warmRoute on keyDown event when key is Enter', () => {
      expect(router.warmRoute).not.toHaveBeenCalled()
      const link = wrap().getByRole('link')
      fireEvent.keyDown(link, { key: 'Enter' })
      fireEvent.keyDown(link, { keyCode: 13 })

      expect(router.warmRoute).toHaveBeenCalledTimes(2)
      expect(router.warmRoute).toHaveBeenCalledWith('/test')
    })

    it('does not trigger router warmRoute on keyDown event when key is not Enter', () => {
      expect(router.warmRoute).not.toHaveBeenCalled()
      const link = wrap().getByRole('link')
      fireEvent.keyDown(link, { key: ' ', code: 'Space' })
      fireEvent.keyDown(link, { key: 'Shft', code: 'ShiftLeft' })
      fireEvent.keyDown(link, { key: 'a', code: 'KeyA' })
      fireEvent.keyDown(link, { key: '1', code: 'Digit1' })

      expect(router.warmRoute).not.toHaveBeenCalled()
    })
  })
})
