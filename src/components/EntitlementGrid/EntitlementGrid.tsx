import { EntitlementCard } from "../EntitlementCard/EntitlementCard"


export const EntitlementGrid = ({entitlements}) => {
    return (
        <div style={styles.grid}>
            {entitlements.map((entitlement) => (
                <EntitlementCard key={entitlement.entitlementID} entitlement={entitlement} isLoading={false}/>
            ))}
        </div>

    )
}

const styles = {
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem',
    }
}