import { EntitlementCard } from "../EntitlementCard/EntitlementCard"


export const EntitlementGrid = ({entitlements, isLoading}) => {
    return (
        <div style={styles.container}>
            <div style={styles.grid}>
                {entitlements.map((entitlement) => (
                    <EntitlementCard key={entitlement.entitlementID} entitlement={entitlement} isLoading={isLoading}/>
                ))}
            </div>
        </div>

    )
}

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem',
        width: '100%',
        boxSizing: 'border-box' as const,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '2rem 1.5rem',
        width: '100%',
    }
}