import React, { useCallback, useContext } from 'react'
import PropTypes from 'prop-types'
import RouterContext from './RouterContext'

const shouldNavigate = event =>
  !event.defaultPrevented && // default prevented would indicate a custom handled event
  event.button === 0 && // we want to action only left mouse clicks
  (!event.target.target || event.target.target === '_self') && // let browser natively handle targets other than "_self"
  !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) // let browser natively handle new window/tab, download and context menu

const Link = React.forwardRef(
  ({ activeClassName, exact, target, to, onClick, ...props }, ref) => {
    const { isActive, preloadCode, warmRoute, history } = useContext(
      RouterContext
    )
    const toIsActive = isActive(to, exact)

    // handle navigation to new route
    const handleClick = useCallback(
      event => {
        if (onClick) onClick(event) // triger custom handler when passed
        if (!shouldNavigate(event)) return

        event.preventDefault()

        // if we are already in the destination URL, mimic behaviour of standard anchor
        // and replace location instead of pushing; to not create new entry in history
        const navigationMethod = isActive(to, true) ? 'replace' : 'push'

        history[navigationMethod](to)
      },
      [onClick, isActive, to, history]
    )

    // Callback to preload just the code for the route: we pass this to
    // onMouseOver and onFocus, which is a weaker signal that the user "may" navigate to the route
    const handlePreloadCode = useCallback(() => {
      preloadCode(to)
    }, [preloadCode, to])

    // Callback to preload the code and prefetch data for the route:
    // we pass this to onMouseDown and onKeyDown (Enter), since this is a stronger
    // signal that the user "will likely" complete the navigation
    const handleWarmRoute = useCallback(
      ({ type, key, code, keyCode }) => {
        if (
          type === 'mousedown' ||
          (type === 'keydown' &&
            (key === 'Enter' ||
              code === 'Enter' ||
              code === 'NumpadEnter' ||
              keyCode === 13))
        ) {
          warmRoute(to)
        }
      },
      [warmRoute, to]
    )

    const elementProps = {
      ...props,
      target,
      ref,
      href: to,
      onClick: handleClick,
      onMouseOver: handlePreloadCode,
      onFocus: handlePreloadCode,
      onMouseDown: handleWarmRoute,
      onKeyDown: handleWarmRoute,
      ...(toIsActive && {
        className: props.className
          ? `${props.className} ${activeClassName}`
          : activeClassName,
        'aria-current': 'page'
      })
    }

    return <a {...elementProps} />
  }
)

Link.propTypes = {
  onClick: PropTypes.func,
  target: PropTypes.string,
  to: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      pathname: PropTypes.string,
      search: PropTypes.string,
      hash: PropTypes.string
    })
  ]).isRequired,
  activeClassName: PropTypes.string,
  exact: PropTypes.bool
}

Link.defaultProps = {
  activeClassName: 'active',
  exact: false
}

Link.displayName = 'Link'

export default Link
