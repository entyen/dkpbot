import { Link, useRouteError } from 'react-router-dom'
import { RejectedDataType } from '../../types'

import './fallback.scss'

export const Fallback = () => {
    const error = useRouteError()
    const knownError = error as RejectedDataType

    return (
        <div role="alert" className="fallback">
            <div className="fallback__img">⚠️</div>
            <h1 className="fallback__title">Something went wrong</h1>
            <span className="fallback__describe">
                {knownError?.messageError} {knownError?.status}
            </span>
            <Link to="/" className="fallback__link">
                Go to home page
            </Link>
        </div>
    )
}